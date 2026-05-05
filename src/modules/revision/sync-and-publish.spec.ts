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
import * as fs from 'fs';
import * as https from 'https';
import { Readable } from 'stream';
import { join } from 'path';
import * as Papa from 'papaparse';

import {
  AuthorizationStrategyEnum,
  Client as Client2,
} from '../client/client.entity';
import { Mandataire } from '../mandataire/mandataire.entity';
import { ChefDeFile } from '../chef_de_file/chef_de_file.entity';
import { RevisionModule } from './revision.module';
import { Revision, StatusRevisionEnum } from './revision.entity';
import { S3Service } from '../file/s3.service';
import { File } from '../file/file.entity';
import { Habilitation } from '../habilitation/habilitation.entity';
import { Perimeter } from '../chef_de_file/perimeters.entity';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { ObjectId } from 'bson';
import { Repository } from 'typeorm';
import { MailerService } from '@nestjs-modules/mailer';
import { generateToken } from '@/lib/utils/token.utils';

process.env.FC_FS_ID = 'coucou';
process.env.ADMIN_TOKEN = 'xxxx';
process.env.BAN_API_URL = 'https://plateforme.adresse.data.gouv.fr';

// IDs dans les fichiers BAL source (anciens IDs) — UUID v4 valides
const OLD_COMMUNE_ID = '11111111-1111-4111-8111-111111111111';
const OLD_TOPONYME_ID = '22222222-2222-4222-8222-222222222222';
const OLD_ADRESSE_ID = '33333333-3333-4333-8333-333333333333';

// IDs attendus dans le fichier produit (venant de la BAN) — UUID v4 valides
const BAN_COMMUNE_ID = '44444444-4444-4444-8444-444444444444';
const BAN_TOPONYME_ID = '55555555-5555-4555-8555-555555555555';
const BAN_ADRESSE_ID = '66666666-6666-4666-8666-666666666666';

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

describe('SYNC AND PUBLISH MODULE', () => {
  let app: INestApplication;
  let postgresContainer: StartedPostgreSqlContainer;
  let postgresClient: Client;
  let mandataireRepository: Repository<Mandataire>;
  let clientRepository: Repository<Client2>;
  let chefDeFileRepository: Repository<ChefDeFile>;
  let habilitationRepository: Repository<Habilitation>;
  let revisionRepository: Repository<Revision>;
  let fileRepository: Repository<File>;
  let s3Service: S3Service;

  const banReferenceCsv = fs.readFileSync(
    join(__dirname, 'mock', 'ban-reference.csv'),
  );

  beforeAll(async () => {
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
        RevisionModule,
        MailerModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    mandataireRepository = app.get(getRepositoryToken(Mandataire));
    clientRepository = app.get(getRepositoryToken(Client2));
    chefDeFileRepository = app.get(getRepositoryToken(ChefDeFile));
    habilitationRepository = app.get(getRepositoryToken(Habilitation));
    revisionRepository = app.get(getRepositoryToken(Revision));
    fileRepository = app.get(getRepositoryToken(File));
    s3Service = app.get<S3Service>(S3Service);
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
    jest.restoreAllMocks();
  });

  function readFile(relativePath: string): Buffer {
    return fs.readFileSync(join(__dirname, 'mock', relativePath));
  }

  /**
   * Crée un client ANCT (admin BAL) sans chefDeFileId,
   * ce qui permet de bypasser la vérification de périmètre dans la validation.
   */
  async function createAdminClient(): Promise<Client2> {
    const mandataire = await mandataireRepository.save(
      mandataireRepository.create({ nom: 'ANCT', email: 'anct@anct.fr' }),
    );
    const client = await clientRepository.save(
      clientRepository.create({
        nom: 'ANCT',
        token: generateToken(),
        authorizationStrategy: AuthorizationStrategyEnum.INTERNAL,
        mandataireId: mandataire.id,
      }),
    );
    process.env.ID_CLIENT_BAL_ADMIN = client.id;
    return client;
  }

  async function createSourceClient(): Promise<Client2> {
    const mandataire = await mandataireRepository.save(
      mandataireRepository.create({
        nom: 'mandataire',
        email: 'mandataire@test.com',
      }),
    );
    return clientRepository.save(
      clientRepository.create({
        nom: 'ANCT',
        token: generateToken(),
        authorizationStrategy: AuthorizationStrategyEnum.INTERNAL,
        mandataireId: mandataire.id,
      }),
    );
  }

  async function createPublishedRevision(
    clientId: string,
    fileId: string,
  ): Promise<Revision> {
    const revision = await revisionRepository.save(
      revisionRepository.create({
        codeCommune: '31591',
        clientId,
        status: StatusRevisionEnum.PUBLISHED,
        isCurrent: true,
        isReady: null,
        publishedAt: new Date(),
      }),
    );
    await fileRepository.save(
      fileRepository.create({ id: fileId, revisionId: revision.id }),
    );
    return revision;
  }

  /**
   * Mock global.fetch pour les appels de formattingBAL (fetch API).
   */
  function mockFetchAssemblage() {
    jest.spyOn(global, 'fetch').mockImplementation(async (url: RequestInfo) => {
      const urlStr = url.toString();
      if (urlStr.includes('/lookup/')) {
        return {
          ok: true,
          json: async () => ({
            typeComposition: 'assemblage',
            withBanId: true,
          }),
        } as Response;
      }
      if (urlStr.includes('/api/district/cog/')) {
        return {
          ok: true,
          json: async () => ({ response: [{ id: BAN_COMMUNE_ID }] }),
        } as Response;
      }
      throw new Error(`fetch non mocké pour : ${urlStr}`);
    });
  }

  function mockFetchLookupBALError() {
    jest.spyOn(global, 'fetch').mockImplementation(async (url: RequestInfo) => {
      const urlStr = url.toString();
      if (urlStr.includes('/lookup/')) {
        return {
          ok: true,
          json: async () => ({ typeComposition: 'bal', withBanId: false }),
        } as Response;
      }
      throw new Error(`fetch non mocké pour : ${urlStr}`);
    });
  }

  /**
   * Mock https.get pour la route de téléchargement du CSV BAN de référence.
   */
  function mockHttpsDownload() {
    jest.spyOn(https, 'get').mockImplementation((url: any, callback: any) => {
      const mockStream = new Readable({ read() {} });
      (mockStream as any).statusCode = 200;
      (mockStream as any).headers = {};
      process.nextTick(() => {
        mockStream.push(banReferenceCsv);
        mockStream.push(null);
      });
      callback(mockStream);
      return { on: jest.fn() } as any;
    });
  }

  /**
   * Setup S3 mocks pour un test de succès.
   * Retourne une fonction permettant de récupérer le fichier écrit.
   */
  function setupS3Mocks(
    originalFileId: string,
    inputCsv: Buffer,
  ): { getWrittenFile: () => Buffer } {
    let writtenFile: Buffer;
    const newFileId = new ObjectId().toHexString();

    jest
      .spyOn(s3Service, 'writeFile')
      .mockImplementation(async (buffer: Buffer) => {
        writtenFile = buffer;
        return newFileId;
      });

    jest
      .spyOn(s3Service, 'getFile')
      .mockImplementation(async (fileId: string) => {
        if (fileId === originalFileId) {
          return inputCsv;
        }
        return writtenFile;
      });

    return { getWrittenFile: () => writtenFile };
  }

  /**
   * Parse un CSV BAL et retourne la première ligne de données.
   */
  function parseFirstRow(csvBuffer: Buffer): Record<string, string> {
    const result = Papa.parse(csvBuffer.toString('utf-8'), {
      header: true,
      delimiter: ';',
      skipEmptyLines: true,
    });
    return result.data[0] as Record<string, string>;
  }

  describe('POST /revisions/:revisionId/sync-ids-ban-publish', () => {
    it('doit retourner 500 quand typeComposition=BAL et withBanId=false', async () => {
      const adminClient = await createAdminClient();
      const sourceClient = await createSourceClient();
      const originalFileId = new ObjectId().toHexString();
      const inputCsv = readFile('1.3-no-ids.csv');

      const sourceRevision = await createPublishedRevision(
        sourceClient.id,
        originalFileId,
      );

      mockFetchLookupBALError();

      jest.spyOn(s3Service, 'getFile').mockResolvedValue(inputCsv);

      const { body } = await request(app.getHttpServer())
        .post(`/revisions/${sourceRevision.id}/sync-ids-ban-publish`)
        .set('Authorization', 'Bearer xxxx')
        .expect(500);

      expect(body.message).toContain(
        "La commune n'a pas d'identifiants stables sur la BAN",
      );

      // Vérifier qu'aucune nouvelle révision n'a été créée pour le client admin
      const adminRevisions = await revisionRepository.find({
        where: { clientId: adminClient.id },
      });
      expect(adminRevisions).toHaveLength(0);
    });

    it('doit synchroniser les IDs BAN et publier avec une BAL 1.3 sans IDs', async () => {
      await createAdminClient();
      const sourceClient = await createSourceClient();
      const originalFileId = new ObjectId().toHexString();
      const inputCsv = readFile('1.3-no-ids.csv');

      const sourceRevision = await createPublishedRevision(
        sourceClient.id,
        originalFileId,
      );

      mockFetchAssemblage();
      mockHttpsDownload();
      const { getWrittenFile } = setupS3Mocks(originalFileId, inputCsv);

      const { body } = await request(app.getHttpServer())
        .post(`/revisions/${sourceRevision.id}/sync-ids-ban-publish`)
        .set('Authorization', 'Bearer xxxx')
        .expect(200);

      expect(body.status).toBe(StatusRevisionEnum.PUBLISHED);
      expect(body.context.extras.sourceRevisionId).toBe(sourceRevision.id);

      const row = parseFirstRow(getWrittenFile());
      expect(row.id_ban_commune).toBe(BAN_COMMUNE_ID);
      expect(row.id_ban_toponyme).toBe(BAN_TOPONYME_ID);
      expect(row.id_ban_adresse).toBe(BAN_ADRESSE_ID);
    });

    it('doit synchroniser les IDs BAN et publier avec une BAL 1.3 avec uid_adresse', async () => {
      await createAdminClient();
      const sourceClient = await createSourceClient();
      const originalFileId = new ObjectId().toHexString();
      const inputCsv = readFile('1.3-with-ids.csv');

      const sourceRevision = await createPublishedRevision(
        sourceClient.id,
        originalFileId,
      );

      mockFetchAssemblage();
      mockHttpsDownload();
      const { getWrittenFile } = setupS3Mocks(originalFileId, inputCsv);

      const { body } = await request(app.getHttpServer())
        .post(`/revisions/${sourceRevision.id}/sync-ids-ban-publish`)
        .set('Authorization', 'Bearer xxxx')
        .expect(200);

      expect(body.status).toBe(StatusRevisionEnum.PUBLISHED);
      expect(body.context.extras.sourceRevisionId).toBe(sourceRevision.id);

      const row = parseFirstRow(getWrittenFile());
      expect(row.id_ban_commune).toBe(BAN_COMMUNE_ID);
      expect(row.id_ban_toponyme).toBe(BAN_TOPONYME_ID);
      expect(row.id_ban_adresse).toBe(BAN_ADRESSE_ID);
      // Les anciens IDs doivent avoir été remplacés
      expect(row.id_ban_commune).not.toBe(OLD_TOPONYME_ID);
      expect(row.id_ban_toponyme).not.toBe(OLD_TOPONYME_ID);
      expect(row.id_ban_adresse).not.toBe(OLD_ADRESSE_ID);
    });

    it('doit synchroniser les IDs BAN et publier avec une BAL 1.4', async () => {
      await createAdminClient();
      const sourceClient = await createSourceClient();
      const originalFileId = new ObjectId().toHexString();
      const inputCsv = readFile('1.4-with-ids.csv');

      const sourceRevision = await createPublishedRevision(
        sourceClient.id,
        originalFileId,
      );

      mockFetchAssemblage();
      mockHttpsDownload();
      const { getWrittenFile } = setupS3Mocks(originalFileId, inputCsv);

      const { body } = await request(app.getHttpServer())
        .post(`/revisions/${sourceRevision.id}/sync-ids-ban-publish`)
        .set('Authorization', 'Bearer xxxx')
        .expect(200);

      expect(body.status).toBe(StatusRevisionEnum.PUBLISHED);
      expect(body.context.extras.sourceRevisionId).toBe(sourceRevision.id);

      const row = parseFirstRow(getWrittenFile());
      expect(row.id_ban_commune).toBe(BAN_COMMUNE_ID);
      expect(row.id_ban_toponyme).toBe(BAN_TOPONYME_ID);
      expect(row.id_ban_adresse).toBe(BAN_ADRESSE_ID);
      // Les anciens IDs doivent avoir été remplacés
      expect(row.id_ban_commune).not.toBe(OLD_COMMUNE_ID);
      expect(row.id_ban_toponyme).not.toBe(OLD_TOPONYME_ID);
      expect(row.id_ban_adresse).not.toBe(OLD_ADRESSE_ID);
    });

    it('doit synchroniser les IDs BAN et publier avec une BAL 1.5', async () => {
      await createAdminClient();
      const sourceClient = await createSourceClient();
      const originalFileId = new ObjectId().toHexString();
      const inputCsv = readFile('1.5-with-ids.csv');

      const sourceRevision = await createPublishedRevision(
        sourceClient.id,
        originalFileId,
      );

      mockFetchAssemblage();
      mockHttpsDownload();
      const { getWrittenFile } = setupS3Mocks(originalFileId, inputCsv);

      const { body } = await request(app.getHttpServer())
        .post(`/revisions/${sourceRevision.id}/sync-ids-ban-publish`)
        .set('Authorization', 'Bearer xxxx')
        .expect(200);

      expect(body.status).toBe(StatusRevisionEnum.PUBLISHED);
      expect(body.context.extras.sourceRevisionId).toBe(sourceRevision.id);

      const row = parseFirstRow(getWrittenFile());
      expect(row.id_ban_commune).toBe(BAN_COMMUNE_ID);
      expect(row.id_ban_toponyme).toBe(BAN_TOPONYME_ID);
      expect(row.id_ban_adresse).toBe(BAN_ADRESSE_ID);
      // Les anciens IDs doivent avoir été remplacés
      expect(row.id_ban_commune).not.toBe(OLD_COMMUNE_ID);
      expect(row.id_ban_toponyme).not.toBe(OLD_TOPONYME_ID);
      expect(row.id_ban_adresse).not.toBe(OLD_ADRESSE_ID);
    });
  });
});
