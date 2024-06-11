import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Connection, connect, Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import * as request from 'supertest';
import { parse } from 'date-fns';

import { Client } from '@/modules/client/client.schema';
import { Revision } from '@/modules/revision/revision.schema';
import { StatModule } from './stats.module';

process.env.FC_FS_ID = 'coucou';
process.env.ADMIN_TOKEN = 'xxxx';

describe('STATS MODULE', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let clientModel: Model<Client>;
  let revisionModel: Model<Revision>;

  beforeAll(async () => {
    // INIT DB
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(uri), StatModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // INIT MODEL
    clientModel = app.get<Model<Client>>(getModelToken(Client.name));
    revisionModel = app.get<Model<Revision>>(getModelToken(Revision.name));
  });

  afterAll(async () => {
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
    await app.close();
  });

  afterEach(async () => {
    await clientModel.deleteMany({});
    await revisionModel.deleteMany({});
  });

  describe('GET /stats/firsts-publications', () => {
    it('GET /stats/firsts-publications forbiden', async () => {
      await request(app.getHttpServer())
        .get(`/stats/firsts-publications`)
        .expect(403);
    });

    it('GET /stats/firsts-publications empty', async () => {
      const response = await request(app.getHttpServer())
        .get(`/stats/firsts-publications`)
        .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
      for (const item of response.body) {
        expect(item.totalCreations).toBe(0);
        expect(item.viaMesAdresses).toBe(0);
        expect(item.viaMoissonneur).toBe(0);
      }
    });

    it('GET /stats/firsts-publications with date', async () => {
      const from = '2000-01-01';
      const to = '2000-02-28';
      const response = await request(app.getHttpServer())
        .get(`/stats/firsts-publications?from=${from}&to=${to}`)
        .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
        .expect(200);

      expect(response.body.length).toBe(59);
      for (const item of response.body) {
        expect(item.totalCreations).toBe(0);
        expect(item.viaMesAdresses).toBe(0);
        expect(item.viaMoissonneur).toBe(0);
      }
      expect(response.body[0].date).toBe('2000-01-01');
      expect(response.body[58].date).toBe('2000-02-28');
    });

    it('GET /stats/firsts-publications with date', async () => {
      await revisionModel.create({
        codeCommune: '91400',
        client: new ObjectId(),
        publishedAt: parse('2000-01-02', 'yyyy-MM-dd', new Date()),
      });
      await revisionModel.create({
        codeCommune: '91400',
        client: new ObjectId(),
        publishedAt: parse('2000-01-04', 'yyyy-MM-dd', new Date()),
      });
      await revisionModel.create({
        codeCommune: '91400',
        client: new ObjectId(),
        publishedAt: parse('2000-03-02', 'yyyy-MM-dd', new Date()),
      });

      const response = await request(app.getHttpServer())
        .get(`/stats/firsts-publications?from=2000-01-01&to=2000-02-28`)
        .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
        .expect(200);

      expect(response.body[0].totalCreations).toBe(0);
      for (let i = 1; i < response.body.length; i++) {
        expect(response.body[i].totalCreations).toBe(1);
      }

      const response2 = await request(app.getHttpServer())
        .get(`/stats/firsts-publications?from=2000-03-01&to=2000-03-28`)
        .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
        .expect(200);
      for (const item of response2.body) {
        expect(item.totalCreations).toBe(1);
      }
    });
  });

  describe('GET /stats/firsts-publications', () => {
    it('GET /stats/publications forbiden', async () => {
      await request(app.getHttpServer()).get(`/stats/publications`).expect(403);
    });

    it('GET /stats/publications empty', async () => {
      const response = await request(app.getHttpServer())
        .get(`/stats/publications`)
        .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
        .expect(200);
      expect(response.body).toEqual([]);
    });

    it('GET /stats/firsts-publications with date', async () => {
      const from = '2000-01-01';
      const to = '2000-02-28';
      const response = await request(app.getHttpServer())
        .get(`/stats/publications?from=${from}&to=${to}`)
        .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
        .expect(200);
      expect(response.body).toEqual([]);
    });

    it('GET /stats/publications with date', async () => {
      await revisionModel.create({
        codeCommune: '91400',
        client: new ObjectId(),
        publishedAt: parse('2000-01-02', 'yyyy-MM-dd', new Date()),
      });
      await revisionModel.create({
        codeCommune: '91400',
        client: new ObjectId(),
        publishedAt: parse('2000-01-02', 'yyyy-MM-dd', new Date()),
      });
      const response = await request(app.getHttpServer())
        .get(`/stats/publications?from=2000-01-01&to=2000-02-28`)
        .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
        .expect(200);

      const resExpected = [
        {
          date: '2000-01-02',
          publishedBAL: {
            '91400': {
              total: 2,
              viaMesAdresses: 0,
              viaMoissonneur: 0,
            },
          },
        },
      ];
      expect(response.body).toEqual(resExpected);
    });
  });
});
