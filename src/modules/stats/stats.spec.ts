import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Connection, connect, Model } from 'mongoose';

import { Client } from '@/modules/client/client.schema';
import { Revision } from '@/modules/revision/revision.schema';
import { RevisionModule } from '@/modules/revision/revision.module';
import { ClientModule } from '@/modules/client/client.module';

process.env.FC_FS_ID = 'coucou';

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
      imports: [MongooseModule.forRoot(uri), RevisionModule, ClientModule],
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
    it('test', async () => {
      expect('OK').toEqual('OK');
    });
  });
});
