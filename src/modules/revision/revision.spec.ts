import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Connection, connect, Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import * as request from 'supertest';
import MockAdapter from 'axios-mock-adapter';
import { add, sub } from 'date-fns';
import axios from 'axios';
import { omit } from 'lodash';
import * as nodemailer from 'nodemailer';

import { Client } from '../client/client.schema';
import { ChefDeFile } from '../chef_de_file/chef_de_file.schema';
import { Mandataire } from '../mandataire/mandataire.schema';
import { RevisionModule } from './revision.module';
import { Habilitation } from '../habilitation/habilitation.schema';
import { Revision, StatusRevisionEnum } from './revision.schema';

process.env.FC_FS_ID = 'coucou';
process.env.ADMIN_TOKEN = 'xxxx';

jest.mock('nodemailer');
const createTransport = nodemailer.createTransport;

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
    sendMailMock.mockReset();
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
});
