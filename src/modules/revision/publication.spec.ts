import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Connection, connect, Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import * as request from 'supertest';
import MockAdapter from 'axios-mock-adapter';
import { add } from 'date-fns';
import * as fs from 'fs';
import axios from 'axios';
import * as nodemailer from 'nodemailer';

import { AuthorizationStrategyEnum, Client } from '../client/client.schema';
import {
  ChefDeFile,
  TypePerimeterEnum,
} from '../chef_de_file/chef_de_file.schema';
import { Mandataire } from '../mandataire/mandataire.schema';
import { RevisionModule } from './revision.module';
import {
  Habilitation,
  StatusHabilitationEnum,
} from '../habilitation/habilitation.schema';
import { Context, Revision, StatusRevisionEnum } from './revision.schema';
import { S3Service } from '../file/s3.service';
import { File } from '../file/file.schema';
import { join } from 'path';

process.env.FC_FS_ID = 'coucou';
process.env.ADMIN_TOKEN = 'xxxx';

jest.mock('nodemailer');
const createTransport = nodemailer.createTransport;

describe('PUBLICATION MODULE', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  const axiosMock = new MockAdapter(axios);
  let clientModel: Model<Client>;
  let mandataireModel: Model<Mandataire>;
  let chefDefileModel: Model<ChefDeFile>;
  let habilitationModel: Model<Habilitation>;
  let revisionModel: Model<Revision>;
  let fileModel: Model<File>;
  let s3Service: S3Service;
  // NODEMAILER
  const sendMailMock = jest.fn();
  createTransport.mockReturnValue({ sendMail: sendMailMock });

  beforeAll(async () => {
    // INIT DB
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(uri), RevisionModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // INIT MODEL
    clientModel = app.get<Model<Client>>(getModelToken(Client.name));
    mandataireModel = app.get<Model<Mandataire>>(
      getModelToken(Mandataire.name),
    );
    chefDefileModel = app.get<Model<ChefDeFile>>(
      getModelToken(ChefDeFile.name),
    );
    habilitationModel = app.get<Model<Habilitation>>(
      getModelToken(Habilitation.name),
    );
    revisionModel = app.get<Model<Revision>>(getModelToken(Revision.name));
    fileModel = app.get<Model<File>>(getModelToken(File.name));
    s3Service = app.get<S3Service>(S3Service);
  });

  afterAll(async () => {
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
    axiosMock.reset();
    await app.close();
  });

  afterEach(async () => {
    await clientModel.deleteMany({});
    await mandataireModel.deleteMany({});
    await chefDefileModel.deleteMany({});
    await habilitationModel.deleteMany({});
    await revisionModel.deleteMany({});
    await fileModel.deleteMany({});
    sendMailMock.mockReset();
  });

  function readFile(relativePath: string) {
    const absolutePath = join(__dirname, 'mock', relativePath);
    return fs.readFileSync(absolutePath);
  }

  async function createClient(
    props: Partial<Client> = {},
    propsChefDeFile: Partial<ChefDeFile> = {},
  ): Promise<Client> {
    const mandataire = await mandataireModel.create({
      nom: 'mandataire',
      email: 'mandataire@test.fr',
    });
    const chefDeFile = await chefDefileModel.create({
      ...propsChefDeFile,
      nom: 'chefDeFile',
      email: 'chefDeFile@test.fr',
      isEmailPublic: true,
    });
    return clientModel.create({
      ...props,
      nom: 'test',
      email: 'test@test.fr',
      token: 'xxxx',
      mandataire: mandataire._id,
      chefDeFile: chefDeFile._id,
    });
  }

  describe('POST communes/:codeCommune/revisions', () => {
    it('GUARD CLIENT NO TOKEN', async () => {
      await request(app.getHttpServer())
        .post(`/communes/91534/revisions`)
        .expect(401);
    });

    it('GUARD CLIENT BAD TOKEN', async () => {
      await request(app.getHttpServer())
        .post(`/communes/91534/revisions`)
        .set('authorization', `Bearer xxxx`)
        .expect(401);
    });

    it('GUARD CLIENT INACTIF', async () => {
      const client: Client = await createClient({ active: false });

      await request(app.getHttpServer())
        .post(`/communes/91534/revisions`)
        .set('authorization', `Bearer ${client.token}`)
        .expect(403);
    });

    it('COMMUNE MIDDLEWARE', async () => {
      const client: Client = await createClient();

      await request(app.getHttpServer())
        .post(`/communes/coucou/revisions`)
        .set('authorization', `Bearer ${client.token}`)
        .expect(404);
    });

    it('POST communes/:codeCommune/revisions', async () => {
      const client: Client = await createClient();

      const { body } = await request(app.getHttpServer())
        .post(`/communes/91534/revisions`)
        .set('authorization', `Bearer ${client.token}`)
        .expect(201);

      expect(body.codeCommune).toBe('91534');
      expect(body.client).toMatchObject({
        _id: client._id.toHexString(),
        nom: 'test',
        mandataire: 'mandataire',
        chefDeFile: 'chefDeFile',
        chefDeFileEmail: 'chefDeFile@test.fr',
      });
      expect(body.status).toBe(StatusRevisionEnum.PENDING);
      expect(body.ready).toBeFalsy();
      expect(body.validation).toEqual({});
      expect(body.context).toEqual({});
      expect(body.publishedAt).toBeNull();
      expect(body.createdAt).toBeDefined();
      expect(body.updatedAt).toBeDefined();
    });

    it('POST communes/:codeCommune/revisions with context', async () => {
      const client: Client = await createClient();

      const context: Context = {
        organisation: 'organization',
        nomComplet: 'nomComplet',
        extras: {
          external_id: '99999',
        },
      };

      const { body } = await request(app.getHttpServer())
        .post(`/communes/91534/revisions`)
        .set('authorization', `Bearer ${client.token}`)
        .send({ context })
        .expect(201);

      expect(body.codeCommune).toBe('91534');
      expect(body.client).toMatchObject({
        _id: client._id.toHexString(),
        nom: 'test',
        mandataire: 'mandataire',
        chefDeFile: 'chefDeFile',
        chefDeFileEmail: 'chefDeFile@test.fr',
      });
      expect(body.status).toBe(StatusRevisionEnum.PENDING);
      expect(body.ready).toBeFalsy();
      expect(body.validation).toEqual({});
      expect(body.publishedAt).toBeNull();
      expect(body.createdAt).toBeDefined();
      expect(body.updatedAt).toBeDefined();
      expect(body.context).toMatchObject(context);
    });
  });

  describe('POST revisions/:revisionId/files/bal', () => {
    it('REVISION MIDDLEWARE BAD OBJECT ID', async () => {
      const client: Client = await createClient();

      await request(app.getHttpServer())
        .put(`/revisions/coucou/files/bal`)
        .set('authorization', `Bearer ${client.token}`)
        .expect({
          statusCode: 400,
          message: 'Revision Id coucou is not ObjectId',
        });
    });

    it('REVISION MIDDLEWARE BAD', async () => {
      const client: Client = await createClient();
      const id = new ObjectId().toHexString();
      await request(app.getHttpServer())
        .put(`/revisions/${id}/files/bal`)
        .set('authorization', `Bearer ${client.token}`)
        .expect({
          statusCode: 404,
          message: `Revision ${id} not found`,
        });
    });

    it('REVISION GUARD', async () => {
      const client: Client = await createClient();
      const revision = await revisionModel.create({
        codeCommune: '91534',
        client: new ObjectId().toHexString(),
      });
      await request(app.getHttpServer())
        .put(`/revisions/${revision._id.toHexString()}/files/bal`)
        .set('authorization', `Bearer ${client.token}`)
        .expect({
          statusCode: 403,
          message: 'Vous n’êtes pas autorisé à accéder à cette révision',
        });
    });

    it('FILE GUARD NO FILE', async () => {
      const client: Client = await createClient();
      const revision = await revisionModel.create({
        codeCommune: '91534',
        client: client._id.toHexString(),
      });
      await request(app.getHttpServer())
        .put(`/revisions/${revision._id.toHexString()}/files/bal`)
        .set('Authorization', `Bearer ${client.token}`)
        .expect({
          statusCode: 404,
          message: 'Fichier non fourni.',
        });
    });

    it('FILE GUARD Content-Encoding', async () => {
      const client: Client = await createClient();
      const file = readFile('1.3-valid.csv');
      const revision = await revisionModel.create({
        codeCommune: '91534',
        client: client._id.toHexString(),
      });
      await request(app.getHttpServer())
        .put(`/revisions/${revision._id.toHexString()}/files/bal`)
        .set('Authorization', `Bearer ${client.token}`)
        .set('Content-Encoding', `gzip`)
        .send(file)
        .expect({
          statusCode: 400,
          message: 'Aucun encodage de contenue dans l’en-tête n’est accepté.',
        });
    });

    it('FILE GUARD Content-MD5', async () => {
      const client: Client = await createClient();
      const file = readFile('1.3-valid.csv');
      const revision = await revisionModel.create({
        codeCommune: '91534',
        client: client._id.toHexString(),
      });
      await request(app.getHttpServer())
        .put(`/revisions/${revision._id.toHexString()}/files/bal`)
        .set('Authorization', `Bearer ${client.token}`)
        .set('Content-MD5', `coucou`)
        .send(file)
        .expect({
          statusCode: 400,
          message:
            'La valeur de l’en-tête Content-MD5 ne correspond pas à la signature MD5 du contenu soumis.',
        });
    });

    it('REVISION ALREADY PUBLISHED', async () => {
      const client: Client = await createClient();
      const file = readFile('1.3-valid.csv');
      const revision = await revisionModel.create({
        codeCommune: '91534',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PUBLISHED,
      });
      await request(app.getHttpServer())
        .put(`/revisions/${revision._id.toHexString()}/files/bal`)
        .set('Authorization', `Bearer ${client.token}`)
        .send(file)
        .expect({
          statusCode: 412,
          message: 'La révision n’est plus modifiable',
        });
    });

    it('REVISION ALREADY FILE', async () => {
      const client: Client = await createClient();
      const file = readFile('1.3-valid.csv');
      const revision = await revisionModel.create({
        codeCommune: '91534',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PENDING,
      });
      fileModel.create({ revisionId: revision._id });
      await request(app.getHttpServer())
        .put(`/revisions/${revision._id.toHexString()}/files/bal`)
        .set('Authorization', `Bearer ${client.token}`)
        .send(file)
        .expect({
          statusCode: 412,
          message: 'Fichier déjà attaché a la révision',
        });
    });

    it('ATTACH FILE', async () => {
      const client: Client = await createClient();
      const file = readFile('1.3-valid.csv');
      const revision = await revisionModel.create({
        codeCommune: '91534',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PENDING,
      });
      const fileId = new ObjectId();
      jest
        .spyOn(s3Service, 'writeFile')
        .mockImplementation(async (buffer: Buffer) => {
          expect(buffer).toEqual(Buffer.from(file));
          return fileId;
        });

      const { body } = await request(app.getHttpServer())
        .put(`/revisions/${revision._id.toHexString()}/files/bal`)
        .set('Authorization', `Bearer ${client.token}`)
        .send(file);

      const expected = {
        _id: fileId.toHexString(),
        revisionId: revision._id.toHexString(),
        name: null,
        type: 'bal',
      };
      expect(body).toMatchObject(expected);
    });
  });

  describe('POST revisions/:revisionId/compute', () => {
    it('COMPUTE REVISION ALREADY PUBLISHED', async () => {
      const client: Client = await createClient();
      const revision = await revisionModel.create({
        codeCommune: '91534',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PUBLISHED,
      });
      await request(app.getHttpServer())
        .post(`/revisions/${revision._id.toHexString()}/compute`)
        .set('Authorization', `Bearer ${client.token}`)
        .expect({
          statusCode: 412,
          message: 'La révision n’est plus modifiable',
        });
    });

    it('COMPUTE REVISION NO FILE', async () => {
      const client: Client = await createClient();
      const revision = await revisionModel.create({
        codeCommune: '91534',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PENDING,
      });
      await request(app.getHttpServer())
        .post(`/revisions/${revision._id.toHexString()}/compute`)
        .set('Authorization', `Bearer ${client.token}`)
        .expect({
          statusCode: 404,
          message: 'Aucun fichier de type `bal` associé à cette révision',
        });
    });

    it('COMPUTE REVISION BAD CODE INSEE', async () => {
      const client: Client = await createClient({
        options: { relaxMode: true },
      });
      const fileData = readFile('1.3-valid.csv');
      const revision = await revisionModel.create({
        codeCommune: '91534',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PENDING,
      });
      const file = await fileModel.create({ revisionId: revision._id });
      jest
        .spyOn(s3Service, 'getFile')
        .mockImplementation(async (fileId: string) => {
          expect(fileId).toEqual(file._id.toHexString());
          return fileData;
        });

      const { body } = await request(app.getHttpServer())
        .post(`/revisions/${revision._id.toHexString()}/compute`)
        .set('Authorization', `Bearer ${client.token}`)
        .send(file);

      expect(body.status).toBe(StatusRevisionEnum.PENDING);
      expect(body.validation.valid).toBeFalsy();
      expect(body.validation.errors).toEqual(
        expect.arrayContaining(['commune_insee.valeur_inattendue']),
      );
      expect(body.validation.warnings).toBeDefined();
      expect(body.validation.infos).toBeDefined();
      expect(body.validation.rowsCount).toBe(1);
    });

    it('COMPUTE REVISION OUT OF PERIMETER', async () => {
      const client: Client = await createClient({
        options: { relaxMode: true },
      });
      const fileData = readFile('1.3-valid.csv');
      const revision = await revisionModel.create({
        codeCommune: '31591',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PENDING,
      });
      const file = await fileModel.create({ revisionId: revision._id });
      jest
        .spyOn(s3Service, 'getFile')
        .mockImplementation(async (fileId: string) => {
          expect(fileId).toEqual(file._id.toHexString());
          return fileData;
        });

      const { body } = await request(app.getHttpServer())
        .post(`/revisions/${revision._id.toHexString()}/compute`)
        .set('Authorization', `Bearer ${client.token}`)
        .send(file);
      expect(body.status).toBe(StatusRevisionEnum.PENDING);
      expect(body.validation.valid).toBeFalsy();
      expect(body.validation.errors).toEqual(
        expect.arrayContaining(['commune_insee.out_of_perimeter']),
      );
      expect(body.validation.warnings).toBeDefined();
      expect(body.validation.infos).toBeDefined();
      expect(body.validation.rowsCount).toBe(1);
    });

    it('COMPUTE REVISION OUT OF PERIMETER', async () => {
      const client: Client = await createClient({
        options: { relaxMode: true },
      });
      const fileData = readFile('1.3-valid.csv');
      const revision = await revisionModel.create({
        codeCommune: '31591',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PENDING,
      });
      const file = await fileModel.create({ revisionId: revision._id });
      jest
        .spyOn(s3Service, 'getFile')
        .mockImplementation(async (fileId: string) => {
          expect(fileId).toEqual(file._id.toHexString());
          return fileData;
        });

      const { body } = await request(app.getHttpServer())
        .post(`/revisions/${revision._id.toHexString()}/compute`)
        .set('Authorization', `Bearer ${client.token}`)
        .send(file);
      expect(body.status).toBe(StatusRevisionEnum.PENDING);
      expect(body.validation.valid).toBeFalsy();
      expect(body.validation.errors).toEqual(
        expect.arrayContaining(['commune_insee.out_of_perimeter']),
      );
      expect(body.validation.warnings).toBeDefined();
      expect(body.validation.infos).toBeDefined();
      expect(body.validation.rowsCount).toBe(1);
    });

    it('COMPUTE REVISION', async () => {
      const client: Client = await createClient(
        {
          options: { relaxMode: true },
        },
        {
          perimetre: [
            {
              type: TypePerimeterEnum.COMMUNE,
              code: '31591',
            },
          ],
        },
      );
      const fileData = readFile('1.3-valid.csv');
      const revision = await revisionModel.create({
        codeCommune: '31591',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PENDING,
      });
      const file = await fileModel.create({ revisionId: revision._id });
      jest
        .spyOn(s3Service, 'getFile')
        .mockImplementation(async (fileId: string) => {
          expect(fileId).toEqual(file._id.toHexString());
          return fileData;
        });

      const { body } = await request(app.getHttpServer())
        .post(`/revisions/${revision._id.toHexString()}/compute`)
        .set('Authorization', `Bearer ${client.token}`)
        .send(file);
      expect(body.status).toBe(StatusRevisionEnum.PENDING);
      expect(body.validation.valid).toBeTruthy();
      expect(body.validation.errors.length).toBe(0);
      expect(body.validation.warnings).toBeDefined();
      expect(body.validation.infos).toBeDefined();
      expect(body.validation.rowsCount).toBe(1);
    });
  });

  describe('POST revisions/:revisionId/publish', () => {
    it('PUBLISH REVISION HABILITATION REQUIRED', async () => {
      const client: Client = await createClient({
        nom: 'test',
        authorizationStrategy: AuthorizationStrategyEnum.HABILITATION,
      });
      const revision = await revisionModel.create({
        codeCommune: '31591',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PENDING,
        ready: true,
      });
      await request(app.getHttpServer())
        .post(`/revisions/${revision._id.toHexString()}/publish`)
        .set('Authorization', `Bearer ${client.token}`)
        .expect({
          statusCode: 400,
          message: 'Le client test nécessite une habilitation pour publier',
        });
    });

    it('PUBLISH REVISION BAD HABILITATION', async () => {
      const client: Client = await createClient({
        authorizationStrategy: AuthorizationStrategyEnum.HABILITATION,
      });
      const revision = await revisionModel.create({
        codeCommune: '31591',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PENDING,
        ready: true,
      });
      const habilitationId = new ObjectId().toHexString();
      await request(app.getHttpServer())
        .post(`/revisions/${revision._id.toHexString()}/publish`)
        .send({ habilitationId })
        .set('Authorization', `Bearer ${client.token}`)
        .expect({
          statusCode: 404,
          message: `L’habilitation ${habilitationId} n’est pas valide`,
        });
    });

    it('PUBLISH REVISION HABILITATION NOT VALID', async () => {
      const client: Client = await createClient({
        authorizationStrategy: AuthorizationStrategyEnum.HABILITATION,
      });
      const revision = await revisionModel.create({
        codeCommune: '31591',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PENDING,
        ready: true,
      });
      const habilitation = await habilitationModel.create({
        status: StatusHabilitationEnum.PENDING,
      });
      await request(app.getHttpServer())
        .post(`/revisions/${revision._id.toHexString()}/publish`)
        .send({ habilitationId: habilitation._id.toHexString() })
        .set('Authorization', `Bearer ${client.token}`)
        .expect({
          statusCode: 404,
          message: `L’habilitation ${habilitation._id.toHexString()} n’est pas valide`,
        });
    });

    it('PUBLISH REVISION NOT READY', async () => {
      const client: Client = await createClient({
        authorizationStrategy: AuthorizationStrategyEnum.HABILITATION,
      });
      const revision = await revisionModel.create({
        codeCommune: '31591',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PENDING,
        ready: false,
      });
      const expiresAt = add(new Date(), { years: 1 });
      const habilitation = await habilitationModel.create({
        status: StatusHabilitationEnum.ACCEPTED,
        expiresAt,
        codeCommune: '31591',
        client: client._id,
      });
      await request(app.getHttpServer())
        .post(`/revisions/${revision._id.toHexString()}/publish`)
        .send({ habilitationId: habilitation._id.toHexString() })
        .set('Authorization', `Bearer ${client.token}`)
        .expect({
          statusCode: 412,
          message: 'La publication n’est pas possible',
        });
    });

    it('PUBLISH REVISION ALREADY PUBLISHED', async () => {
      const client: Client = await createClient({
        authorizationStrategy: AuthorizationStrategyEnum.HABILITATION,
      });
      const revision = await revisionModel.create({
        codeCommune: '31591',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PUBLISHED,
        ready: false,
      });
      const expiresAt = add(new Date(), { years: 1 });
      const habilitation = await habilitationModel.create({
        status: StatusHabilitationEnum.ACCEPTED,
        expiresAt,
        codeCommune: '31591',
        client: client._id,
      });
      await request(app.getHttpServer())
        .post(`/revisions/${revision._id.toHexString()}/publish`)
        .send({ habilitationId: habilitation._id.toHexString() })
        .set('Authorization', `Bearer ${client.token}`)
        .expect({
          statusCode: 412,
          message: 'La publication n’est pas possible',
        });
    });

    it('PUBLISH REVISION FIRST PUBLISH', async () => {
      const client: Client = await createClient({
        authorizationStrategy: AuthorizationStrategyEnum.HABILITATION,
      });
      const revision = await revisionModel.create({
        codeCommune: '31591',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PENDING,
        ready: true,
      });
      const expiresAt = add(new Date(), { years: 1 });
      const habilitation = await habilitationModel.create({
        status: StatusHabilitationEnum.ACCEPTED,
        expiresAt,
        codeCommune: '31591',
        client: client._id,
      });
      const { body } = await request(app.getHttpServer())
        .post(`/revisions/${revision._id.toHexString()}/publish`)
        .send({ habilitationId: habilitation._id.toHexString() })
        .set('Authorization', `Bearer ${client.token}`)
        .expect(200);
      expect(body.publishedAt).toBeDefined();
      expect(body.status).toBe(StatusRevisionEnum.PUBLISHED);
      expect(body.current).toBeTruthy();
      expect(body.ready).toBeNull();
      expect(body.habilitation).toMatchObject({
        _id: habilitation._id.toHexString(),
        codeCommune: '31591',
        expiresAt: expiresAt.toISOString(),
      });
    });

    it('PUBLISH REVISION WITHOUT HABILITATION', async () => {
      const client: Client = await createClient({
        authorizationStrategy: AuthorizationStrategyEnum.CHEF_DE_FILE,
      });
      const revision = await revisionModel.create({
        codeCommune: '31591',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PENDING,
        ready: true,
      });
      const { body } = await request(app.getHttpServer())
        .post(`/revisions/${revision._id.toHexString()}/publish`)
        .set('Authorization', `Bearer ${client.token}`)
        .expect(200);
      expect(body.publishedAt).toBeDefined();
      expect(body.status).toBe(StatusRevisionEnum.PUBLISHED);
      expect(body.current).toBeTruthy();
      expect(body.ready).toBeNull();
    });

    it('PUBLISH REVISION MULTI REVISION', async () => {
      const client: Client = await createClient({
        authorizationStrategy: AuthorizationStrategyEnum.CHEF_DE_FILE,
      });
      const revision1 = await revisionModel.create({
        codeCommune: '31591',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PENDING,
        ready: true,
      });
      const { _id: readyId } = await revisionModel.create({
        codeCommune: '31591',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PENDING,
        current: false,
        ready: false,
      });

      const { _id: currentId } = await revisionModel.create({
        codeCommune: '31591',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PUBLISHED,
        current: true,
      });
      const { body } = await request(app.getHttpServer())
        .post(`/revisions/${revision1._id.toHexString()}/publish`)
        .set('Authorization', `Bearer ${client.token}`)
        .expect(200);
      expect(body.publishedAt).toBeDefined();
      expect(body.status).toBe(StatusRevisionEnum.PUBLISHED);
      expect(body.current).toBeTruthy();
      expect(body.ready).toBeNull();

      const oldRevision = await revisionModel.findById(currentId);
      expect(oldRevision.current).toBeFalsy();

      const readyRevision = await revisionModel.findById(readyId);
      expect(readyRevision.ready).toBeFalsy();
    });
  });
});
