import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Connection, connect, Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import * as request from 'supertest';

import { Client } from './client.schema';
import { ClientModule } from './client.module';
import { UpdateClientDTO } from './dto/update_client.dto';
import { Mandataire } from '../mandataire/mandataire.schema';
import { ChefDeFile } from '../chef_de_file/chef_de_file.schema';

process.env.FC_FS_ID = 'coucou';
process.env.ADMIN_TOKEN = 'xxxx';

describe('CLIENT MODULE', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let clientModel: Model<Client>;
  let mandataireModel: Model<Mandataire>;
  let chefDefileModel: Model<ChefDeFile>;

  beforeAll(async () => {
    // INIT DB
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(uri), ClientModule],
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
  });

  afterAll(async () => {
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
    await app.close();
  });

  afterEach(async () => {
    await clientModel.deleteMany({});
    await mandataireModel.deleteMany({});
    await chefDefileModel.deleteMany({});
  });

  function getClient(props: UpdateClientDTO): UpdateClientDTO {
    return {
      ...props,
      mandataire: new ObjectId().toHexString(),
      chefDeFile: new ObjectId().toHexString(),
    };
  }

  it('GET /clients empty', async () => {
    const response = await request(app.getHttpServer())
      .get(`/clients`)
      .expect(200);
    expect(response.body).toEqual([]);
  });

  it('POST /clients 403', async () => {
    const client = getClient({
      nom: 'client_test',
    });
    await request(app.getHttpServer())
      .post(`/clients`)
      .send(client)
      .expect(403);
  });

  it('POST /clients default', async () => {
    const client = getClient({
      nom: 'client_test',
    });
    const response = await await request(app.getHttpServer())
      .post(`/clients`)
      .send(client)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .expect(200);

    expect(response.body).toMatchObject(client);
  });

  it('POST /clients', async () => {
    const client = getClient({
      nom: 'client_test',
      active: false,
      options: {
        relaxMode: true,
      },
    });
    const response = await request(app.getHttpServer())
      .post(`/clients`)
      .send(client)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .expect(200);
    expect(response.body).toMatchObject(client);
  });

  it('GET /clients/:id', async () => {
    const client = getClient({
      nom: 'client_test',
      active: false,
      options: {
        relaxMode: true,
      },
    });
    const { body }: { body: Client } = await request(app.getHttpServer())
      .post(`/clients`)
      .send(client)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .expect(200);

    const { body: clientResponse }: { body: Client } = await request(
      app.getHttpServer(),
    )
      .get(`/clients/${body._id}`)
      .expect(200);

    expect(clientResponse).toMatchObject(client);
  });

  it('GET /clients/:id 400', async () => {
    await request(app.getHttpServer()).get(`/clients/coucou`).expect(400);
  });

  it('GET /clients/:id 404', async () => {
    await request(app.getHttpServer())
      .get(`/clients/${new ObjectId().toHexString()}`)
      .expect(404);
  });

  it('GET /clients', async () => {
    const client = getClient({
      nom: 'client_test',
      active: false,
      options: {
        relaxMode: true,
      },
    });
    await request(app.getHttpServer())
      .post(`/clients`)
      .send(client)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .expect(200);

    const { body: clientResponses }: { body: Client[] } = await request(
      app.getHttpServer(),
    )
      .get(`/clients`)
      .expect(200);

    expect(clientResponses[0]).toMatchObject(client);
  });

  it('GET /clients', async () => {
    const client = getClient({
      nom: 'client_test',
      active: false,
      options: {
        relaxMode: true,
      },
    });
    await request(app.getHttpServer())
      .post(`/clients`)
      .send(client)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/clients`)
      .send(client)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/clients`)
      .send(client)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .expect(200);

    const response2 = await request(app.getHttpServer())
      .get(`/clients`)
      .expect(200);

    expect(response2.body.length).toBe(3);
  });

  it('PUT /clients', async () => {
    const client = getClient({
      nom: 'client_test',
      active: false,
      options: {
        relaxMode: true,
      },
    });
    const response = await request(app.getHttpServer())
      .post(`/clients`)
      .send(client)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .expect(200);

    const change: UpdateClientDTO = {
      nom: 'put_test',
      active: true,
      options: {
        relaxMode: false,
      },
    };

    const response3 = await request(app.getHttpServer())
      .put(`/clients/${response.body._id}`)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .send(change)
      .expect(200);

    expect(response3.body).toMatchObject(change);

    const response4 = await request(app.getHttpServer())
      .get(`/clients/${response.body._id}`)
      .expect(200);

    expect(response4.body).toMatchObject(change);
  });

  it('PUT 403 /clients', async () => {
    const client = getClient({
      nom: 'client_test',
      active: false,
      options: {
        relaxMode: true,
      },
    });
    const response = await request(app.getHttpServer())
      .post(`/clients`)
      .send(client)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .expect(200);

    const change: UpdateClientDTO = {
      nom: 'put_test',
      active: true,
      options: {
        relaxMode: false,
      },
    };

    await request(app.getHttpServer())
      .put(`/clients/${response.body._id}`)
      .send(change)
      .expect(403);

    const response4 = await request(app.getHttpServer())
      .get(`/clients/${response.body._id}`)
      .expect(200);

    expect(response4.body).toMatchObject(client);
  });

  it('PUT /clients/:id 400', async () => {
    const change = getClient({
      nom: 'client_test',
      active: false,
      options: {
        relaxMode: true,
      },
    });

    await request(app.getHttpServer())
      .put(`/clients/coucou`)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .send(change)
      .expect(400);
  });

  it('PUT /clients/:id 404', async () => {
    const change = getClient({
      nom: 'client_test',
      active: false,
      options: {
        relaxMode: true,
      },
    });

    await request(app.getHttpServer())
      .put(`/clients/${new ObjectId().toHexString()}`)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .send(change)
      .expect(404);
  });
});
