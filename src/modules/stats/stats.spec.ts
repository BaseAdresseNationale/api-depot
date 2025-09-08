import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Client } from 'pg';
import { Test, TestingModule } from '@nestjs/testing';
import {
  Global,
  INestApplication,
  Module,
  ValidationPipe,
} from '@nestjs/common';
import * as request from 'supertest';
import { parse, subYears, subMonths, subDays } from 'date-fns';

import {
  AuthorizationStrategyEnum,
  Client as Client2,
} from '@/modules/client/client.entity';
import { Revision } from '@/modules/revision/revision.entity';
import { StatModule } from './stats.module';
import { MailerService } from '@nestjs-modules/mailer';
import { Mandataire } from '../mandataire/mandataire.entity';
import { Habilitation } from '../habilitation/habilitation.entity';
import { File } from '../file/file.entity';
import { Perimeter } from '../chef_de_file/perimeters.entity';
import { ChefDeFile } from '../chef_de_file/chef_de_file.entity';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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

describe('STATS MODULE', () => {
  let app: INestApplication;
  let postgresContainer: StartedPostgreSqlContainer;
  let postgresClient: Client;
  let mandataireRepository: Repository<Mandataire>;
  let clientRepository: Repository<Client2>;
  let chefDeFileRepository: Repository<ChefDeFile>;
  let habilitationRepository: Repository<Habilitation>;
  let revisionRepository: Repository<Revision>;
  let fileRepository: Repository<File>;

  beforeAll(async () => {
    // INIT DB
    postgresContainer = await new PostgreSqlContainer().start();
    postgresClient = new Client({
      host: postgresContainer.getHost(),
      port: postgresContainer.getPort(),
      database: postgresContainer.getDatabase(),
      user: postgresContainer.getUsername(),
      password: postgresContainer.getPassword(),
    });
    await postgresClient.connect();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: postgresContainer.getHost(),
          port: postgresContainer.getPort(),
          username: postgresContainer.getUsername(),
          password: postgresContainer.getPassword(),
          database: postgresContainer.getDatabase(),
          synchronize: true,
          entities: [
            Client2,
            ChefDeFile,
            Perimeter,
            Habilitation,
            Revision,
            File,
            Mandataire,
          ],
        }),
        StatModule,
        MailerModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // INIT MODEL
    mandataireRepository = app.get(getRepositoryToken(Mandataire));
    clientRepository = app.get(getRepositoryToken(Client2));
    chefDeFileRepository = app.get(getRepositoryToken(ChefDeFile));
    habilitationRepository = app.get(getRepositoryToken(Habilitation));
    revisionRepository = app.get(getRepositoryToken(Revision));
    fileRepository = app.get(getRepositoryToken(File));
  });

  afterAll(async () => {
    await postgresClient.end();
    await postgresContainer.stop();
    await app.close();
  });

  afterEach(async () => {
    await mandataireRepository.delete({});
    await clientRepository.delete({});
    await chefDeFileRepository.delete({});
    await habilitationRepository.delete({});
    await revisionRepository.delete({});
    await fileRepository.delete({});
  });

  async function createClient(props: Partial<Client2> = {}): Promise<Client2> {
    const mandataireToSave = mandataireRepository.create({
      nom: 'mandataire',
      email: 'mandataire@test.com',
    });
    const mandataire = await mandataireRepository.save(mandataireToSave);
    const chefDeFileToSave = chefDeFileRepository.create({
      nom: 'chefDeFile',
      email: 'chefDeFile@test.fr',
      isEmailPublic: true,
    });
    const chefDeFile = await chefDeFileRepository.save(chefDeFileToSave);
    const clientToSave: Client2 = clientRepository.create({
      ...props,
      nom: 'test',
      token: 'xxxx',
      authorizationStrategy: AuthorizationStrategyEnum.CHEF_DE_FILE,
      mandataireId: mandataire.id,
      chefDeFileId: chefDeFile.id,
    });
    return clientRepository.save(clientToSave);
  }

  async function createRevision(
    props: Partial<Revision> = {},
  ): Promise<Revision> {
    const client = await createClient();
    const revisionToSave: Revision = revisionRepository.create({
      clientId: client.id,
      ...props,
    });
    return revisionRepository.save(revisionToSave);
  }

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
      await createRevision({
        codeCommune: '91400',
        publishedAt: parse('2000-01-02', 'yyyy-MM-dd', new Date()),
      });
      await createRevision({
        codeCommune: '91400',
        publishedAt: parse('2000-01-04', 'yyyy-MM-dd', new Date()),
      });
      await createRevision({
        codeCommune: '91400',
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
      await createRevision({
        codeCommune: '91400',
        publishedAt: parse('2000-01-02', 'yyyy-MM-dd', new Date()),
      });
      await createRevision({
        codeCommune: '91400',
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

  describe('GET /stats/metrics-incubateur', () => {
    it('GET /stats/metrics-incubateur with offset and limit', async () => {
      // Créer plusieurs révisions pour tester la pagination
      await createRevision({
        codeCommune: '91400',
        publishedAt: parse('2023-01-01', 'yyyy-MM-dd', new Date()),
      });
      await createRevision({
        codeCommune: '91401',
        publishedAt: parse('2023-02-01', 'yyyy-MM-dd', new Date()),
      });
      await createRevision({
        codeCommune: '91402',
        publishedAt: parse('2023-03-01', 'yyyy-MM-dd', new Date()),
      });
      await createRevision({
        codeCommune: '91403',
        publishedAt: parse('2023-04-01', 'yyyy-MM-dd', new Date()),
      });

      // Test avec offset=1 et limit=2
      const response = await request(app.getHttpServer())
        .get(`/stats/metrics-incubateur?offset=1&limit=2`)
        .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
        .expect(200);
      expect(response.body.count).toBe(4);
      expect(response.body.results).toHaveLength(2);
      expect(response.body.results[0].insee).toBe('91401');
      expect(response.body.results[1].insee).toBe('91402');
    });

    it('GET /stats/metrics-incubateur metrics calculation', async () => {
      const now = new Date();
      const twoYearAgo = subYears(now, 2);
      const twoMonthAgo = subMonths(now, 2);
      const tenDayAgo = subDays(now, 10);
      const twoDayAgo = subDays(now, 2);

      // Créer des révisions avec différentes dates pour tester les métriques
      await createRevision({
        codeCommune: '91400',
        publishedAt: twoYearAgo, // YAU = 0, MAU = 0, WAU = 0
      });
      await createRevision({
        codeCommune: '91401',
        publishedAt: twoMonthAgo, // YAU = 1, MAU = 0, WAU = 0
      });
      await createRevision({
        codeCommune: '91402',
        publishedAt: tenDayAgo, // YAU = 1, MAU = 1, WAU = 0
      });
      await createRevision({
        codeCommune: '91403',
        publishedAt: twoYearAgo, // YAU = 0, MAU = 0, WAU = 0 no selected
      });
      await createRevision({
        codeCommune: '91403',
        publishedAt: twoMonthAgo, /// YAU = 1, MAU = 0, WAU = 0 no selected
      });
      await createRevision({
        codeCommune: '91403',
        publishedAt: twoDayAgo, // YAU = 1, MAU = 1, WAU = 1
      });

      const response = await request(app.getHttpServer())
        .get(`/stats/metrics-incubateur`)
        .set('authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
        .expect(200);

      expect(response.body.count).toBe(4);
      expect(response.body.results).toHaveLength(4);

      // Vérifier les métriques pour chaque révision
      const results = response.body.results;

      // Première révision (oneYearAgo)
      expect(results[0].metrics.tu).toBe(1);
      expect(results[0].metrics.yau).toBe(0);
      expect(results[0].metrics.mau).toBe(0);
      expect(results[0].metrics.wau).toBe(0);

      // Deuxième révision (oneMonthAgo)
      expect(results[1].metrics.tu).toBe(1);
      expect(results[1].metrics.yau).toBe(1);
      expect(results[1].metrics.mau).toBe(0);
      expect(results[1].metrics.wau).toBe(0);

      // Troisième révision (oneDayAgo)
      expect(results[2].metrics.tu).toBe(1);
      expect(results[2].metrics.yau).toBe(1);
      expect(results[2].metrics.mau).toBe(1);
      expect(results[2].metrics.wau).toBe(0);

      // Quatrième révision (twoDaysAgo)
      expect(results[3].metrics.tu).toBe(1);
      expect(results[3].metrics.yau).toBe(1);
      expect(results[3].metrics.mau).toBe(1);
      expect(results[3].metrics.wau).toBe(1);
    });
  });
});
