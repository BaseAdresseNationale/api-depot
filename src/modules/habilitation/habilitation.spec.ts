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
import { add, sub } from 'date-fns';
import axios from 'axios';
import { omit } from 'lodash';

import {
  Habilitation,
  StatusHabilitationEnum,
  TypeStrategyEnum,
} from './habilitation.schema';
import { AuthorizationStrategyEnum, Client } from '../client/client.schema';
import { ChefDeFile } from '../chef_de_file/chef_de_file.schema';
import { Mandataire } from '../mandataire/mandataire.schema';
import { HabilitationModule } from './habilitation.module';
import { MailerService } from '@nestjs-modules/mailer';

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

describe('HABILITATION MODULE', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  const axiosMock = new MockAdapter(axios);
  let clientModel: Model<Client>;
  let mandataireModel: Model<Mandataire>;
  let chefDefileModel: Model<ChefDeFile>;
  let habilitationModel: Model<Habilitation>;

  beforeAll(async () => {
    // INIT DB
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(uri), HabilitationModule, MailerModule],
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
      authorizationStrategy: AuthorizationStrategyEnum.CHEF_DE_FILE,
      mandataire: mandataire._id,
      chefDeFile: chefDeFile._id,
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
          `/catalog/datasets/api-lannuaire-administration/records?where=pivot%20LIKE%20"mairie"%20AND%20code_insee_commune="${codeCommune}"&limit=100`,
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
        client: client._id,
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

      const res = {
        ...omit(habilitation, 'strategy.pinCode'),
        client: {
          _id: client._id.toHexString(),
          nom: 'test',
          mandataire: 'mandataire',
          chefDeFile: 'chefDeFile',
          chefDeFileEmail: 'chefDeFile@test.fr',
        },
      };
      expect(body).toMatchObject(res);
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
    });

    it('SEND CODE PIN ALREADY SEND', async () => {
      const client: Client = await createClient();
      const habilitation = {
        codeCommune: '91534',
        emailCommune: 'test@test.fr',
        status: StatusHabilitationEnum.PENDING,
      };

      const { _id } = await habilitationModel.create(habilitation);

      await request(app.getHttpServer())
        .post(`/habilitations/${_id}/authentication/email/send-pin-code`)
        .set('authorization', `Bearer ${client.token}`)
        .expect(200);
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
        .expect(412);

      expect(body).toMatchObject({
        statusCode: 412,
        message: 'Code non valide. Demande rejetée.',
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
        .expect(412);

      expect(body).toMatchObject({
        statusCode: 412,
        message: 'Code non valide, 9 tentatives restantes',
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
        .expect(412);

      expect(body).toMatchObject({
        statusCode: 412,
        message: 'Code expiré',
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

      await request(app.getHttpServer())
        .post(`/habilitations/${_id}/authentication/email/validate-pin-code`)
        .set('authorization', `Bearer ${client.token}`)
        .send({ code: '0000' })
        .expect(200);

      const afterHabilitation = await habilitationModel.findById(_id);
      expect(afterHabilitation.status).toBe(StatusHabilitationEnum.ACCEPTED);
      expect(afterHabilitation.acceptedAt).toBeDefined();
      expect(afterHabilitation.expiresAt).toBeDefined();
    });
  });
});
