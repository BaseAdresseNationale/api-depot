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

import {
  Habilitation,
  StatusHabilitationEnum,
  TypeStrategyEnum,
} from './habilitation.schema';
import { Client } from '../client/client.schema';
import { ChefDeFile } from '../chef_de_file/chef_de_file.schema';
import { Mandataire } from '../mandataire/mandataire.schema';
import { HabilitationModule } from './habilitation.module';

process.env.FC_FS_ID = 'coucou';
process.env.ADMIN_TOKEN = 'xxxx';

jest.mock('nodemailer');
const createTransport = nodemailer.createTransport;

describe('HABILITATION MODULE', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  const axiosMock = new MockAdapter(axios);
  let clientModel: Model<Client>;
  let mandataireModel: Model<Mandataire>;
  let chefDefileModel: Model<ChefDeFile>;
  let habilitationModel: Model<Habilitation>;
  // NODEMAILER
  const sendMailMock = jest.fn();
  createTransport.mockReturnValue({ sendMail: sendMailMock });

  beforeAll(async () => {
    // INIT DB
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(uri), HabilitationModule],
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
    sendMailMock.mockReset();
  });

  async function createClient(props: Partial<Client> = {}): Promise<Client> {
    return clientModel.create({
      ...props,
      nom: 'test',
      email: 'test@test.fr',
      token: 'xxxx',
      mandataire: new ObjectId().toHexString(),
      chefDeFile: new ObjectId().toHexString(),
    });
  }

  describe('CLIENT GUARD', () => {
    it('COMMUNE MIDLEWARE BAD', async () => {
      const client: Client = await createClient();
      await request(app.getHttpServer())
        .post(`/communes/91400/habilitations`)
        .set('authorization', `Bearer ${client.token}`)
        .expect(404);
    });
  });

  describe('CLIENT GUARD NO TOKEN', () => {
    it('CLIENT GUARD NO TOKEN', async () => {
      await request(app.getHttpServer())
        .post(`/communes/91534/habilitations`)
        .expect(401);
    });

    it('CLIENT GUARD BAD TOKEN', async () => {
      await request(app.getHttpServer())
        .post(`/communes/91534/habilitations`)
        .set('authorization', `Bearer xxxx`)
        .expect(401);
    });

    it('CLIENT GUARD INACTIVE', async () => {
      const client: Client = await createClient({ active: false });
      await request(app.getHttpServer())
        .post(`/communes/91534/habilitations`)
        .set('authorization', `Bearer ${client.token}`)
        .expect(403);
    });
  });

  describe('POST /communes/:codeCommune/habilitations', () => {
    it('CREATED NO EMAIL', async () => {
      const client: Client = await createClient();
      const { body } = await request(app.getHttpServer())
        .post(`/communes/91534/habilitations`)
        .set('authorization', `Bearer ${client.token}`)
        .expect(201);

      const hab = {
        codeCommune: '91534',
        strategy: null,
        expiresAt: null,
        client: client._id.toHexString(),
        status: StatusHabilitationEnum.PENDING,
      };

      expect(body).toMatchObject(hab);
    });

    it('CREATED WITH EMAIL', async () => {
      const client: Client = await createClient();
      const codeCommune: string = '91534';
      const emailCommune: string = 'saclay@test.fr';
      // MOCK AXIOS
      const data: any = {
        results: [
          {
            nom: 'mairie principal',
            adresse_courriel: emailCommune,
          },
        ],
      };
      axiosMock
        .onGet(
          `/catalog/datasets/api-lannuaire-administration/records?where=pivot%20LIKE%20"mairie"%20AND%20code_insee_commune="${codeCommune}`,
        )
        .reply(200, data);

      const { body } = await request(app.getHttpServer())
        .post(`/communes/${codeCommune}/habilitations`)
        .set('authorization', `Bearer ${client.token}`)
        .expect(201);

      const hab = {
        codeCommune,
        emailCommune,
        strategy: null,
        expiresAt: null,
        client: client._id.toHexString(),
        status: StatusHabilitationEnum.PENDING,
      };

      expect(body).toMatchObject(hab);
    });
  });

  describe('GET /habilitations/:habilitationId', () => {
    it('HABILITATION MIDLEWARE NO OBJECT ID', async () => {
      await request(app.getHttpServer())
        .get(`/habilitations/coucou`)
        .expect(400);
    });

    it('HABILITATION MIDLEWARE BAD HABILITATION ID', async () => {
      await request(app.getHttpServer())
        .get(`/habilitations/${new ObjectId().toHexString()}`)
        .expect(404);
    });

    it('GET /habilitations/:habilitationId', async () => {
      const client: Client = await createClient();
      const habilitation = {
        codeCommune: '94000',
        emailCommune: 'test@test.fr',
        client: new ObjectId().toHexString(),
        status: StatusHabilitationEnum.PENDING,
        strategy: {
          type: TypeStrategyEnum.EMAIL,
          pinCode: '00000',
        },
      };

      const { _id } = await habilitationModel.create(habilitation);

      const { body } = await request(app.getHttpServer())
        .get(`/habilitations/${_id}`)
        .set('authorization', `Bearer ${client.token}`)
        .expect(200);
      expect(body).toMatchObject(omit(habilitation, 'strategy.pinCode'));
    });
  });

  describe('PUT /habilitations/:habilitationId/validate', () => {
    it('ADMIN GUARD NO TOKEN', async () => {
      const habilitation = {
        codeCommune: '94000',
        emailCommune: 'test@test.fr',
        status: StatusHabilitationEnum.PENDING,
        strategy: {
          type: TypeStrategyEnum.EMAIL,
          pinCode: '00000',
        },
      };

      const { _id } = await habilitationModel.create(habilitation);

      await request(app.getHttpServer())
        .put(`/habilitations/${_id}/validate`)
        .expect(403);
    });

    it('ADMIN GUARD TOKEN', async () => {
      const habilitation = {
        codeCommune: '94000',
        emailCommune: 'test@test.fr',
        status: StatusHabilitationEnum.PENDING,
        strategy: {
          type: TypeStrategyEnum.EMAIL,
          pinCode: '00000',
        },
      };

      const { _id } = await habilitationModel.create(habilitation);

      const { body } = await request(app.getHttpServer())
        .put(`/habilitations/${_id}/validate`)
        .set('authorization', `Token ${process.env.ADMIN_TOKEN}`)
        .expect(200);

      expect(body.expiresAt).toBeDefined();
      expect(body.expiresAt).not.toBeNull();
      expect(body.acceptedAt).toBeDefined();
      expect(body.acceptedAt).not.toBeNull();
      expect(body.status).toBe(StatusHabilitationEnum.ACCEPTED);
      expect(body.strategy.type).toBe(TypeStrategyEnum.INTERNAL);
    });

    it('ADMIN GUARD BEARER AND CHECK VALIDATE', async () => {
      const habilitation = {
        codeCommune: '94000',
        emailCommune: 'test@test.fr',
        status: StatusHabilitationEnum.PENDING,
        strategy: {
          type: TypeStrategyEnum.EMAIL,
          pinCode: '00000',
        },
      };

      const { _id } = await habilitationModel.create(habilitation);

      const { body } = await request(app.getHttpServer())
        .put(`/habilitations/${_id}/validate`)
        .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
        .expect(200);

      expect(body.expiresAt).toBeDefined();
      expect(body.expiresAt).not.toBeNull();
      expect(body.acceptedAt).toBeDefined();
      expect(body.acceptedAt).not.toBeNull();
      expect(body.status).toBe(StatusHabilitationEnum.ACCEPTED);
      expect(body.strategy.type).toBe(TypeStrategyEnum.INTERNAL);
    });
  });

  describe('POST /habilitations/:habilitationId/authentication/email/send-pin-code', () => {
    it('SEND CODE PIN ALREADY ACCEPETED', async () => {
      const client: Client = await createClient();
      const habilitation = {
        codeCommune: '94000',
        emailCommune: 'test@test.fr',
        status: StatusHabilitationEnum.ACCEPTED,
      };

      const { _id } = await habilitationModel.create(habilitation);

      await request(app.getHttpServer())
        .post(`/habilitations/${_id}/authentication/email/send-pin-code`)
        .set('authorization', `Bearer ${client.token}`)
        .expect(412);

      expect(sendMailMock).not.toHaveBeenCalled();
    });

    it('SEND CODE PIN ALREADY REJECTED', async () => {
      const client: Client = await createClient();
      const habilitation = {
        codeCommune: '94000',
        emailCommune: 'test@test.fr',
        status: StatusHabilitationEnum.REJECTED,
      };

      const { _id } = await habilitationModel.create(habilitation);

      await request(app.getHttpServer())
        .post(`/habilitations/${_id}/authentication/email/send-pin-code`)
        .set('authorization', `Bearer ${client.token}`)
        .expect(412);

      expect(sendMailMock).not.toHaveBeenCalled();
    });

    it('SEND CODE PIN NO EMAIL', async () => {
      const client: Client = await createClient();
      const habilitation = {
        codeCommune: '94000',
        status: StatusHabilitationEnum.PENDING,
      };

      const { _id } = await habilitationModel.create(habilitation);

      await request(app.getHttpServer())
        .post(`/habilitations/${_id}/authentication/email/send-pin-code`)
        .set('authorization', `Bearer ${client.token}`)
        .expect(412);

      expect(sendMailMock).not.toHaveBeenCalled();
    });

    it('SEND CODE PIN ALREADY SEND', async () => {
      const client: Client = await createClient();
      const habilitation = {
        codeCommune: '94000',
        emailCommune: 'test@test.fr',
        status: StatusHabilitationEnum.PENDING,
        strategy: {
          createdAt: new Date(),
        },
      };

      const { _id } = await habilitationModel.create(habilitation);

      await request(app.getHttpServer())
        .post(`/habilitations/${_id}/authentication/email/send-pin-code`)
        .set('authorization', `Bearer ${client.token}`)
        .expect(409);

      expect(sendMailMock).not.toHaveBeenCalled();
    });

    it('SEND CODE PIN ALREADY SEND', async () => {
      const client: Client = await createClient();
      const habilitation = {
        codeCommune: '91534',
        emailCommune: 'test@test.fr',
        status: StatusHabilitationEnum.PENDING,
      };

      const { _id } = await habilitationModel.create(habilitation);

      const { body } = await request(app.getHttpServer())
        .post(`/habilitations/${_id}/authentication/email/send-pin-code`)
        .set('authorization', `Bearer ${client.token}`)
        .expect(200);

      expect(body.strategy.type).toBe(TypeStrategyEnum.EMAIL);
      expect(body.strategy.pinCode).not.toBeDefined();
      expect(body.strategy.pinCodeExpiration).toBeDefined();
      expect(body.strategy.pinCodeExpiration).not.toBeNull();
      expect(body.strategy.createdAt).toBeDefined();
      expect(body.strategy.createdAt).not.toBeNull();
      expect(body.strategy.remainingAttempts).toBe(10);

      expect(sendMailMock).toHaveBeenCalled();
    });
  });

  describe('POST /habilitations/:habilitationId/authentication/email/validate-pin-code', () => {
    it('VALIDATE CODE PIN ALREADY ACCEPETED', async () => {
      const client: Client = await createClient();
      const habilitation = {
        codeCommune: '94000',
        emailCommune: 'test@test.fr',
        status: StatusHabilitationEnum.ACCEPTED,
      };

      const { _id } = await habilitationModel.create(habilitation);

      await request(app.getHttpServer())
        .post(`/habilitations/${_id}/authentication/email/validate-pin-code`)
        .set('authorization', `Bearer ${client.token}`)
        .send({ code: '0000' })
        .expect(412);
    });

    it('VALIDATE CODE PIN ALREADY ACCEPETED', async () => {
      const client: Client = await createClient();
      const habilitation = {
        codeCommune: '94000',
        emailCommune: 'test@test.fr',
        status: StatusHabilitationEnum.REJECTED,
      };

      const { _id } = await habilitationModel.create(habilitation);

      await request(app.getHttpServer())
        .post(`/habilitations/${_id}/authentication/email/validate-pin-code`)
        .set('authorization', `Bearer ${client.token}`)
        .send({ code: '0000' })
        .expect(412);
    });

    it('VALIDATE CODE PIN BAD CODE', async () => {
      const client: Client = await createClient();
      const habilitation = {
        codeCommune: '94000',
        emailCommune: 'test@test.fr',
        status: StatusHabilitationEnum.PENDING,
        strategy: {
          type: 'email',
          pinCodeExpiration: add(new Date(), { years: 1 }),
          pinCode: '0000',
          createdAt: '2024-05-27T09:19:07.770Z',
          remainingAttempts: 0,
        },
      };

      const { _id } = await habilitationModel.create(habilitation);

      const { body } = await request(app.getHttpServer())
        .post(`/habilitations/${_id}/authentication/email/validate-pin-code`)
        .set('authorization', `Bearer ${client.token}`)
        .send({ code: '1111' })
        .expect(200);

      expect(body).toMatchObject({
        validated: false,
        error: 'Code non valide. Demande rejetée.',
        remainingAttempts: 0,
      });

      const afterHabilitation = await habilitationModel.findById(_id);
      expect(afterHabilitation.rejectedAt).toBeDefined();
      expect(afterHabilitation.status).toBe(StatusHabilitationEnum.REJECTED);
      expect(afterHabilitation.acceptedAt).not.toBeDefined();
      expect(afterHabilitation.expiresAt).not.toBeDefined();
    });

    it('VALIDATE CODE PIN BAD CODE', async () => {
      const client: Client = await createClient();
      const habilitation = {
        codeCommune: '94000',
        emailCommune: 'test@test.fr',
        status: StatusHabilitationEnum.PENDING,
        strategy: {
          type: 'email',
          pinCodeExpiration: add(new Date(), { years: 1 }),
          pinCode: '0000',
          createdAt: '2024-05-27T09:19:07.770Z',
          remainingAttempts: 10,
        },
      };

      const { _id } = await habilitationModel.create(habilitation);

      const { body } = await request(app.getHttpServer())
        .post(`/habilitations/${_id}/authentication/email/validate-pin-code`)
        .set('authorization', `Bearer ${client.token}`)
        .send({ code: '1111' })
        .expect(200);

      expect(body).toMatchObject({
        validated: false,
        error: 'Code non valide, 9 tentatives restantes',
        remainingAttempts: 9,
      });

      const afterHabilitation = await habilitationModel.findById(_id);
      expect(afterHabilitation.status).toBe(StatusHabilitationEnum.PENDING);
      expect(afterHabilitation.acceptedAt).not.toBeDefined();
      expect(afterHabilitation.expiresAt).not.toBeDefined();
    });

    it('VALIDATE CODE PIN DATE EXPIRE', async () => {
      const client: Client = await createClient();
      const habilitation = {
        codeCommune: '94000',
        emailCommune: 'test@test.fr',
        status: StatusHabilitationEnum.PENDING,
        strategy: {
          type: 'email',
          pinCodeExpiration: sub(new Date(), { years: 1 }),
          pinCode: '0000',
          createdAt: '2024-05-27T09:19:07.770Z',
          remainingAttempts: 10,
        },
      };

      const { _id } = await habilitationModel.create(habilitation);

      const { body } = await request(app.getHttpServer())
        .post(`/habilitations/${_id}/authentication/email/validate-pin-code`)
        .set('authorization', `Bearer ${client.token}`)
        .send({ code: '0000' })
        .expect(200);

      expect(body).toMatchObject({
        validated: false,
        error: 'Code expiré',
      });

      const afterHabilitation = await habilitationModel.findById(_id);
      expect(afterHabilitation.status).toBe(StatusHabilitationEnum.PENDING);
      expect(afterHabilitation.acceptedAt).not.toBeDefined();
      expect(afterHabilitation.expiresAt).not.toBeDefined();
    });

    it('VALIDATE CODE PIN', async () => {
      const client: Client = await createClient();
      const habilitation = {
        codeCommune: '94000',
        emailCommune: 'test@test.fr',
        status: StatusHabilitationEnum.PENDING,
        strategy: {
          type: 'email',
          pinCodeExpiration: add(new Date(), { years: 1 }),
          pinCode: '0000',
          createdAt: '2024-05-27T09:19:07.770Z',
          remainingAttempts: 10,
        },
      };

      const { _id } = await habilitationModel.create(habilitation);

      const { body } = await request(app.getHttpServer())
        .post(`/habilitations/${_id}/authentication/email/validate-pin-code`)
        .set('authorization', `Bearer ${client.token}`)
        .send({ code: '0000' })
        .expect(200);

      expect(body).toMatchObject({
        validated: true,
      });

      const afterHabilitation = await habilitationModel.findById(_id);
      expect(afterHabilitation.status).toBe(StatusHabilitationEnum.ACCEPTED);
      expect(afterHabilitation.acceptedAt).toBeDefined();
      expect(afterHabilitation.expiresAt).toBeDefined();
    });
  });
});
