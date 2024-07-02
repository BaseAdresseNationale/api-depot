import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Connection, connect, Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import * as request from 'supertest';

import { Mandataire } from './mandataire.schema';
import { MandataireModule } from './mandataire.module';
import { UpdateMandataireDTO } from './dto/update_mandataire.dto';

process.env.FC_FS_ID = 'coucou';
process.env.ADMIN_TOKEN = 'xxxx';

describe('MANDATAIRE MODULE', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let mandataireModel: Model<Mandataire>;

  beforeAll(async () => {
    // INIT DB
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(uri), MandataireModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // INIT MODEL
    mandataireModel = app.get<Model<Mandataire>>(
      getModelToken(Mandataire.name),
    );
  });

  afterAll(async () => {
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
    await app.close();
  });

  afterEach(async () => {
    await mandataireModel.deleteMany({});
  });

  it('GET /mandataires empty', async () => {
    const response = await request(app.getHttpServer())
      .get(`/mandataires`)
      .expect(200);
    expect(response.body).toEqual([]);
  });

  it('POST /mandataires', async () => {
    const mandataire: UpdateMandataireDTO = {
      nom: 'test',
      email: 'test@test.fr',
    };
    await request(app.getHttpServer())
      .post(`/mandataires`)
      .send(mandataire)
      .expect(403);
  });

  it('POST /mandataires', async () => {
    const mandataire: UpdateMandataireDTO = {
      nom: 'test',
      email: 'test@test.fr',
    };
    const response = await request(app.getHttpServer())
      .post(`/mandataires`)
      .send(mandataire)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .expect(200);
    expect(response.body).toMatchObject(mandataire);
  });

  it('GET /mandataires/:id', async () => {
    const mandataire: UpdateMandataireDTO = {
      nom: 'test',
      email: 'test@test.fr',
    };
    const response = await request(app.getHttpServer())
      .post(`/mandataires`)
      .send(mandataire)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .expect(200);

    const response2 = await request(app.getHttpServer())
      .get(`/mandataires/${response.body._id}`)
      .expect(200);

    expect(response2.body).toMatchObject(mandataire);
  });

  it('GET /mandataires/:id 400', async () => {
    await request(app.getHttpServer()).get(`/mandataires/coucou`).expect(400);
  });

  it('GET /mandataires/:id 404', async () => {
    await request(app.getHttpServer())
      .get(`/mandataires/${new ObjectId().toHexString()}`)
      .expect(404);
  });

  it('GET /mandataires', async () => {
    const mandataire: UpdateMandataireDTO = {
      nom: 'test',
      email: 'test@test.fr',
    };
    await request(app.getHttpServer())
      .post(`/mandataires`)
      .send(mandataire)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .expect(200);

    const response = await request(app.getHttpServer())
      .get(`/mandataires`)
      .expect(200);

    expect(response.body[0]).toMatchObject(mandataire);
  });

  it('GET /mandataires', async () => {
    const mandataire: UpdateMandataireDTO = {
      nom: 'test',
      email: 'test@test.fr',
    };
    await request(app.getHttpServer())
      .post(`/mandataires`)
      .send(mandataire)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/mandataires`)
      .send(mandataire)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/mandataires`)
      .send(mandataire)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .expect(200);

    const response2 = await request(app.getHttpServer())
      .get(`/mandataires`)
      .expect(200);

    expect(response2.body.length).toBe(3);
  });

  it('PUT /mandataires', async () => {
    const mandataire: UpdateMandataireDTO = {
      nom: 'test',
      email: 'test@test.fr',
    };
    const response = await request(app.getHttpServer())
      .post(`/mandataires`)
      .send(mandataire)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .expect(200);

    const change: UpdateMandataireDTO = {
      nom: 'nom',
      email: 'nom@test.fr',
    };

    const response3 = await request(app.getHttpServer())
      .put(`/mandataires/${response.body._id}`)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .send(change)
      .expect(200);

    expect(response3.body).toMatchObject(change);

    const response4 = await request(app.getHttpServer())
      .get(`/mandataires/${response.body._id}`)
      .expect(200);

    expect(response4.body).toMatchObject(change);
  });

  it('PUT 403 /mandataires', async () => {
    const mandataire: UpdateMandataireDTO = {
      nom: 'test',
      email: 'test@test.fr',
    };
    const response = await request(app.getHttpServer())
      .post(`/mandataires`)
      .send(mandataire)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .expect(200);

    const change: UpdateMandataireDTO = {
      nom: 'nom',
      email: 'nom@test.fr',
    };

    await request(app.getHttpServer())
      .put(`/mandataires/${response.body._id}`)
      .send(change)
      .expect(403);

    const response4 = await request(app.getHttpServer())
      .get(`/mandataires/${response.body._id}`)
      .expect(200);

    expect(response4.body).toMatchObject(mandataire);
  });

  it('PUT /mandataires/:id 404', async () => {
    const change: UpdateMandataireDTO = {
      nom: 'nom',
      email: 'nom@test.fr',
    };

    await request(app.getHttpServer())
      .put(`/mandataires/coucou`)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .send(change)
      .expect(400);
  });

  it('PUT /mandataires/:id 404', async () => {
    const change: UpdateMandataireDTO = {
      nom: 'nom',
      email: 'nom@test.fr',
    };

    await request(app.getHttpServer())
      .put(`/mandataires/${new ObjectId().toHexString()}`)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .send(change)
      .expect(404);
  });
});
