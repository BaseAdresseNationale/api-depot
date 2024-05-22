import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Connection, connect, Model } from 'mongoose';
import * as request from 'supertest';

import { ChefDeFileModule } from './chef_de_file.module';
import { ChefDeFile, TypePerimeterEnum } from './chef_de_file.schema';
import { UpdateChefDeFileDTO } from './dto/update_chef_de_file.dto';

process.env.FC_FS_ID = 'coucou';
process.env.ADMIN_TOKEN = 'xxxx';

describe('CHEF_DE_FILE MODULE', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let chefDeFileModel: Model<ChefDeFile>;

  beforeAll(async () => {
    // INIT DB
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(uri), ChefDeFileModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // INIT MODEL
    chefDeFileModel = app.get<Model<ChefDeFile>>(
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
    await chefDeFileModel.deleteMany({});
  });

  it('GET /chefs_de_file empty', async () => {
    const response = await request(app.getHttpServer())
      .get(`/chefs_de_file`)
      .expect(200);
    expect(response.body).toEqual([]);
  });

  it('POST /chefs_de_file', async () => {
    const chef_de_file: UpdateChefDeFileDTO = {
      nom: 'test',
      email: 'test@test.fr',
      isEmailPublic: true,
      perimetre: [],
    };
    await request(app.getHttpServer())
      .post(`/chefs_de_file`)
      .send(chef_de_file)
      .expect(403);
  });

  it('POST /chefs_de_file', async () => {
    const chef_de_file: UpdateChefDeFileDTO = {
      nom: 'test',
      email: 'test@test.fr',
      isEmailPublic: true,
      perimetre: [
        {
          type: TypePerimeterEnum.COMMUNE,
          code: '00000',
        },
      ],
    };
    const response = await request(app.getHttpServer())
      .post(`/chefs_de_file`)
      .send(chef_de_file)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .expect(200);
    expect(response.body).toMatchObject(chef_de_file);
  });

  it('POST /chefs_de_file default', async () => {
    const chef_de_file: UpdateChefDeFileDTO = {
      nom: 'test',
      email: 'test@test.fr',
    };
    const response = await request(app.getHttpServer())
      .post(`/chefs_de_file`)
      .send(chef_de_file)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .expect(200);

    const resExpected = {
      nom: 'test',
      email: 'test@test.fr',
      isEmailPublic: false,
      perimetre: [],
    };
    expect(response.body).toMatchObject(resExpected);
  });

  it('GET /chefs_de_file/:id', async () => {
    const chef_de_file: UpdateChefDeFileDTO = {
      nom: 'test',
      email: 'test@test.fr',
      isEmailPublic: true,
      perimetre: [],
    };
    const response = await request(app.getHttpServer())
      .post(`/chefs_de_file`)
      .send(chef_de_file)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .expect(200);

    const response2 = await request(app.getHttpServer())
      .get(`/chefs_de_file/${response.body._id}`)
      .expect(200);

    expect(response2.body).toMatchObject(chef_de_file);
  });

  it('GET /chefs_de_file/:id 404', async () => {
    await request(app.getHttpServer()).get(`/chefs_de_file/coucou`).expect(400);
  });

  it('GET /chefs_de_file', async () => {
    const chef_de_file: UpdateChefDeFileDTO = {
      nom: 'test',
      email: 'test@test.fr',
      isEmailPublic: true,
      perimetre: [],
    };
    await request(app.getHttpServer())
      .post(`/chefs_de_file`)
      .send(chef_de_file)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .expect(200);

    const response = await request(app.getHttpServer())
      .get(`/chefs_de_file`)
      .expect(200);

    expect(response.body[0]).toMatchObject(chef_de_file);
  });

  it('GET /chefs_de_file', async () => {
    const chef_de_file: UpdateChefDeFileDTO = {
      nom: 'test',
      email: 'test@test.fr',
      isEmailPublic: true,
      perimetre: [],
    };
    await request(app.getHttpServer())
      .post(`/chefs_de_file`)
      .send(chef_de_file)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/chefs_de_file`)
      .send(chef_de_file)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/chefs_de_file`)
      .send(chef_de_file)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .expect(200);

    const response2 = await request(app.getHttpServer())
      .get(`/chefs_de_file`)
      .expect(200);

    expect(response2.body.length).toBe(3);
  });

  it('PUT /chefs_de_file', async () => {
    const chef_de_file: UpdateChefDeFileDTO = {
      nom: 'test',
      email: 'test@test.fr',
      isEmailPublic: true,
      perimetre: [],
    };
    const response = await request(app.getHttpServer())
      .post(`/chefs_de_file`)
      .send(chef_de_file)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .expect(200);

    const change: UpdateChefDeFileDTO = {
      nom: 'nom',
      email: 'nom@test.fr',
      isEmailPublic: false,
      perimetre: [
        {
          type: TypePerimeterEnum.COMMUNE,
          code: '00000',
        },
      ],
    };

    const response3 = await request(app.getHttpServer())
      .put(`/chefs_de_file/${response.body._id}`)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .send(change)
      .expect(200);

    expect(response3.body).toMatchObject(change);

    const response4 = await request(app.getHttpServer())
      .get(`/chefs_de_file/${response.body._id}`)
      .expect(200);

    expect(response4.body).toMatchObject(change);
  });

  it('PUT 403 /chefs_de_file', async () => {
    const chef_de_file: UpdateChefDeFileDTO = {
      nom: 'test',
      email: 'test@test.fr',
      isEmailPublic: true,
      perimetre: [],
    };
    const response = await request(app.getHttpServer())
      .post(`/chefs_de_file`)
      .send(chef_de_file)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .expect(200);

    const change: UpdateChefDeFileDTO = {
      nom: 'nom',
      email: 'nom@test.fr',
      isEmailPublic: false,
      perimetre: [
        {
          type: TypePerimeterEnum.COMMUNE,
          code: '00000',
        },
      ],
    };

    await request(app.getHttpServer())
      .put(`/chefs_de_file/${response.body._id}`)
      .send(change)
      .expect(403);

    const response4 = await request(app.getHttpServer())
      .get(`/chefs_de_file/${response.body._id}`)
      .expect(200);

    expect(response4.body).toMatchObject(chef_de_file);
  });

  it('PUT /chefs_de_file/:id 404', async () => {
    const change: UpdateChefDeFileDTO = {
      nom: 'nom',
      email: 'nom@test.fr',
      isEmailPublic: false,
      perimetre: [
        {
          type: TypePerimeterEnum.COMMUNE,
          code: '00000',
        },
      ],
    };

    await request(app.getHttpServer())
      .put(`/chefs_de_file/coucou`)
      .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .send(change)
      .expect(400);
  });
});
