import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';

import { ApiAnnuraireModule } from './api_annuraire.module';
import { ApiAnnuaireService } from './api_annuraire.service';

describe('API ANNURAIRE MODULE', () => {
  let app: INestApplication;
  let apiAnnuaireService: ApiAnnuaireService;
  const axiosMock = new MockAdapter(axios);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ApiAnnuraireModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    apiAnnuaireService = app.get<ApiAnnuaireService>(ApiAnnuaireService);
  });

  afterAll(async () => {
    await app.close();
    jest.clearAllMocks();
    axiosMock.reset();
  });

  describe('getEmailCommune', () => {
    it('getEmailCommune multi mairie', async () => {
      const codeCommune = '91400';

      // MOCK AXIOS
      const data: any = {
        results: [
          {
            nom: 'mairie principal',
            adresse_courriel: 'ok@test.fr',
          },
          {
            nom: 'mairie deleguee',
            adresse_courriel: 'wrong@test.fr',
          },
        ],
      };
      axiosMock
        .onGet(
          `/catalog/datasets/api-lannuaire-administration/records?where=pivot%20LIKE%20"mairie"%20AND%20code_insee_commune="${codeCommune}`,
        )
        .reply(200, data);

      const email = await apiAnnuaireService.getEmailCommune(codeCommune);

      expect(email).toBe('ok@test.fr');
    });

    it('getEmailCommune multi email', async () => {
      const codeCommune = '91400';

      // MOCK AXIOS
      const data: any = {
        results: [
          {
            nom: 'mairie principal',
            adresse_courriel: 'ok@test.fr;wrong@test.fr',
          },
        ],
      };
      axiosMock
        .onGet(
          `/catalog/datasets/api-lannuaire-administration/records?where=pivot%20LIKE%20"mairie"%20AND%20code_insee_commune="${codeCommune}`,
        )
        .reply(200, data);

      const email = await apiAnnuaireService.getEmailCommune(codeCommune);

      expect(email).toBe('ok@test.fr');
    });

    it('getEmailCommune multi email', async () => {
      const codeCommune = '91400';

      // MOCK AXIOS
      const data: any = {
        results: [
          {
            nom: 'mairie deleguee',
            adresse_courriel: 'ok',
          },
        ],
      };
      axiosMock
        .onGet(
          `/catalog/datasets/api-lannuaire-administration/records?where=pivot%20LIKE%20"mairie"%20AND%20code_insee_commune="${codeCommune}`,
        )
        .reply(200, data);

      const email = await apiAnnuaireService.getEmailCommune(codeCommune);
      expect(email).toBeUndefined();
    });

    it('getEmailCommune multi email', async () => {
      const codeCommune = '91400';

      // MOCK AXIOS
      const data: any = {
        results: [
          {
            nom: 'mairie principal',
            adresse_courriel: 'ok',
          },
        ],
      };
      axiosMock
        .onGet(
          `/catalog/datasets/api-lannuaire-administration/records?where=pivot%20LIKE%20"mairie"%20AND%20code_insee_commune="${codeCommune}`,
        )
        .reply(200, data);

      const email = await apiAnnuaireService.getEmailCommune(codeCommune);
      expect(email).toBeUndefined();
    });

    it('getEmailCommune multi email', async () => {
      const codeCommune = '91400';
      const email = await apiAnnuaireService.getEmailCommune(codeCommune);
      expect(email).toBeUndefined();
    });
  });
});
