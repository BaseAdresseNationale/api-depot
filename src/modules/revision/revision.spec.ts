import { Test, TestingModule } from '@nestjs/testing';
import {
  Global,
  INestApplication,
  Module,
  ValidationPipe,
} from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Connection, connect, Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import * as request from 'supertest';
import MockAdapter from 'axios-mock-adapter';
import { sub } from 'date-fns';
import axios from 'axios';
import { MailerService } from '@nestjs-modules/mailer';

import { Client } from '../client/client.schema';
import { ChefDeFile } from '../chef_de_file/chef_de_file.schema';
import { Mandataire } from '../mandataire/mandataire.schema';
import { RevisionModule } from './revision.module';
import { Habilitation } from '../habilitation/habilitation.schema';
import { Revision, StatusRevisionEnum } from './revision.schema';
import { S3Service } from '../file/s3.service';
import { File } from '../file/file.schema';

process.env.FC_FS_ID = 'coucou';
process.env.ADMIN_TOKEN = 'xxxx';

@Global()
@Module({
  providers: [
    {
      provide: MailerService,
      useValue: {
        sendMail: jest.fn(),
      },
    },
  ],
  exports: [MailerService],
})
class MailerModule {}

describe('REVISION MODULE', () => {
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

  beforeAll(async () => {
    // INIT DB
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(uri), RevisionModule, MailerModule],
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
  });

  async function createClient(props: Partial<Client> = {}): Promise<Client> {
    const mandataire = await mandataireModel.create({
      nom: 'mandataire',
      email: 'mandataire@test.fr',
    });
    const chefDeFile = await chefDefileModel.create({
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

  describe('GET /current-revisions', () => {
    it('GET /current-revisions MULTI COMMUNE', async () => {
      const client: Client = await createClient();

      await revisionModel.create({
        codeCommune: '91477',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PUBLISHED,
        current: true,
      });

      await revisionModel.create({
        codeCommune: '91534',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PUBLISHED,
        current: true,
      });

      const { body } = await request(app.getHttpServer())
        .get(`/current-revisions`)
        .expect(200);
      expect(body.length).toBe(2);
    });

    it('GET /current-revisions DETAIL ONE', async () => {
      const client: Client = await createClient();

      await revisionModel.create({
        codeCommune: '91534',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PUBLISHED,
        current: true,
        publishedAt: new Date(),
      });

      await revisionModel.create({
        codeCommune: '91534',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PUBLISHED,
        current: false,
      });

      await revisionModel.create({
        codeCommune: '91534',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PENDING,
        current: false,
      });

      const { body } = await request(app.getHttpServer())
        .get(`/current-revisions`)
        .expect(200);

      expect(body.length).toBe(1);
      expect(body[0].codeCommune).toBe('91534');
      expect(body[0]._id).toBeDefined();
      expect(body[0].publishedAt).toBeDefined;
      expect(body[0].client).toMatchObject({
        _id: client._id.toHexString(),
        nom: 'test',
        mandataire: 'mandataire',
        chefDeFile: 'chefDeFile',
        chefDeFileEmail: 'chefDeFile@test.fr',
      });
    });

    it('GET /current-revisions publishedSince 1 revisions', async () => {
      const client: Client = await createClient();

      await revisionModel.create({
        codeCommune: '91534',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PUBLISHED,
        current: true,
        publishedAt: sub(new Date(), { years: 1 }),
      });

      await revisionModel.create({
        codeCommune: '91534',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PUBLISHED,
        current: true,
        publishedAt: sub(new Date(), { weeks: 1 }),
      });

      const { body } = await request(app.getHttpServer())
        .get(
          `/current-revisions?publishedSince=${sub(new Date(), { months: 1 })}`,
        )
        .expect(200);

      expect(body.length).toBe(1);
    });
  });

  describe('GET /communes/:codeCommune/current-revision', () => {
    it('GET /communes/:codeCommune/current-revision NOT EXIST', async () => {
      await request(app.getHttpServer())
        .get(`/communes/91400/current-revision`)
        .expect(404);
    });

    it('GET /communes/:codeCommune/current-revision', async () => {
      const client: Client = await createClient();

      await revisionModel.create({
        codeCommune: '91534',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PUBLISHED,
        current: true,
        publishedAt: sub(new Date(), { years: 1 }),
      });

      const { body } = await request(app.getHttpServer())
        .get(`/communes/91534/current-revision`)
        .expect(200);

      expect(body.codeCommune).toBe('91534');
      expect(body.status).toBe(StatusRevisionEnum.PUBLISHED);
      expect(body.current).toBe(true);
      expect(body.client).toMatchObject({
        _id: client._id.toHexString(),
        nom: 'test',
        mandataire: 'mandataire',
        chefDeFile: 'chefDeFile',
        chefDeFileEmail: 'chefDeFile@test.fr',
      });
    });
  });

  describe('GET /communes/:codeCommune/revisions', () => {
    it('GET /communes/:codeCommune/revisions NOT EXIST', async () => {
      await request(app.getHttpServer())
        .get(`/communes/91400/current-revision`)
        .expect(404);
    });

    it('GET /communes/:codeCommune/revisions', async () => {
      const client: Client = await createClient();

      await revisionModel.create({
        codeCommune: '91534',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PUBLISHED,
        current: true,
      });

      await revisionModel.create({
        codeCommune: '91534',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PUBLISHED,
        current: false,
      });

      await revisionModel.create({
        codeCommune: '91534',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PUBLISHED,
        current: false,
      });

      const { body } = await request(app.getHttpServer())
        .get(`/communes/91534/revisions`)
        .expect(200);

      expect(body.length).toBe(3);
      expect(body[0].codeCommune).toBe('91534');
      expect(body[0].status).toBe(StatusRevisionEnum.PUBLISHED);
      expect(body[0].current).toBe(true);
      expect(body[0].client).toMatchObject({
        _id: client._id.toHexString(),
        nom: 'test',
        mandataire: 'mandataire',
        chefDeFile: 'chefDeFile',
        chefDeFileEmail: 'chefDeFile@test.fr',
      });
    });
  });

  describe('GET /communes/:codeCommune/current-revision/files/bal/download', () => {
    it('GET /communes/:codeCommune/current-revision/files/bal/download NOT EXIST', async () => {
      await request(app.getHttpServer())
        .get(`/communes/91400/current-revision`)
        .expect(404);
    });

    it('GET /communes/:codeCommune/current-revision/files/bal/download NOT CURRENT', async () => {
      const client: Client = await createClient();
      await revisionModel.create({
        codeCommune: '91534',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PUBLISHED,
        current: false,
      });

      await request(app.getHttpServer())
        .get(`/communes/91534/current-revision`)
        .expect(404);
    });

    it('GET /communes/:codeCommune/current-revision/files/bal/download NO FILE', async () => {
      const client: Client = await createClient();
      await revisionModel.create({
        codeCommune: '91534',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PUBLISHED,
        current: true,
      });

      await request(app.getHttpServer())
        .get(`/communes/91534/current-revision/files/bal/download`)
        .expect(404);
    });

    it('GET /communes/:codeCommune/current-revision/files/bal/download', async () => {
      const client: Client = await createClient();
      const { _id: revisionId } = await revisionModel.create({
        codeCommune: '91534',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PUBLISHED,
        current: true,
      });

      const { _id } = await fileModel.create({ revisionId });

      const fileData = Buffer.from('file data');

      jest
        .spyOn(s3Service, 'getFile')
        .mockImplementation(async (fileId: string) => {
          expect(fileId).toBe(_id.toHexString());
          return fileData;
        });

      const { text } = await request(app.getHttpServer())
        .get(`/communes/91534/current-revision/files/bal/download`)
        .expect(200);

      expect(text).toEqual(fileData.toString());
    });
  });

  describe('GET /revisions/:revisionId', () => {
    it('GET /revisions/:revisionId BAD OBJECT ID', async () => {
      await request(app.getHttpServer()).get(`/revisions/coucou`).expect(400);
    });

    it('GET /revisions/:revisionId NOT EXIST', async () => {
      await request(app.getHttpServer())
        .get(`/revisions/${new ObjectId().toHexString()}`)
        .expect(404);
    });

    it('GET /revisions/:revisionId', async () => {
      const client: Client = await createClient();

      const { _id } = await revisionModel.create({
        codeCommune: '91534',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PUBLISHED,
        current: true,
      });

      const { body } = await request(app.getHttpServer())
        .get(`/revisions/${_id.toHexString()}`)
        .expect(200);

      expect(body.codeCommune).toBe('91534');
      expect(body.status).toBe(StatusRevisionEnum.PUBLISHED);
      expect(body.current).toBe(true);
      expect(body.client).toMatchObject({
        _id: client._id.toHexString(),
        nom: 'test',
        mandataire: 'mandataire',
        chefDeFile: 'chefDeFile',
        chefDeFileEmail: 'chefDeFile@test.fr',
      });
    });
  });

  describe('GET /revisions/:revisionId/files/bal/download', () => {
    it('GET /revisions/:revisionId/files/bal/download BAD OBJECT ID', async () => {
      await request(app.getHttpServer())
        .get(`/revisions/coucou/files/bal/download`)
        .expect(400);
    });

    it('GET /revisions/:revisionId/files/bal/download NOT EXIST', async () => {
      await request(app.getHttpServer())
        .get(`/revisions/${new ObjectId().toHexString()}/files/bal/download`)
        .expect(404);
    });

    it('GET /revisions/:revisionId/files/bal/download NO FILE', async () => {
      const client: Client = await createClient();
      const { _id } = await revisionModel.create({
        codeCommune: '91534',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PUBLISHED,
        current: true,
      });

      await request(app.getHttpServer())
        .get(`/revisions/${_id.toHexString()}/files/bal/download`)
        .expect(404);
    });

    it('GET /revisions/:revisionId/files/bal/download', async () => {
      const client: Client = await createClient();
      const { _id: revisionId } = await revisionModel.create({
        codeCommune: '91534',
        client: client._id.toHexString(),
        status: StatusRevisionEnum.PUBLISHED,
        current: true,
      });

      const { _id } = await fileModel.create({ revisionId });

      const fileData = Buffer.from('file data');

      jest
        .spyOn(s3Service, 'getFile')
        .mockImplementation(async (fileId: string) => {
          expect(fileId).toBe(_id.toHexString());
          return fileData;
        });

      const { text } = await request(app.getHttpServer())
        .get(`/revisions/${revisionId.toHexString()}/files/bal/download`)
        .expect(200);

      expect(text).toEqual(fileData.toString());
    });
  });
});
