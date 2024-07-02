#!/usr/bin/env node

import axios from 'axios';
import * as csvParser from 'csv-parser';
import { outputFile } from 'fs-extra';

import { Elu, Mandat } from '../../src/lib/types/elu.type';
import * as eluUtils from './elu.utils';
import * as mandatUtils from './mandat.utils';
import { normalizeStr } from './util';

export interface RowElu {
  codeCommune: string;
  nomComplet: string;
  prenom: string;
  sexe: 'F' | 'M';
  dateNaissance: string;
  dateDebutMandat: string;
  libelleFonction: string;
}

async function loadElus(): Promise<Elu[]> {
  const { data }: any = await axios({
    method: 'get',
    url: 'https://www.data.gouv.fr/fr/datasets/r/d5f400de-ae3f-4966-8cb6-a85c70c6c24a',
    responseType: 'stream',
  });

  const headersMapping = {
    ...eluUtils.headersMapping,
    ...mandatUtils.headersMapping,
  };

  const elus: Record<string, Elu> = {};

  return new Promise((resolve) => {
    data
      .pipe(
        csvParser({
          separator: ';',
          mapHeaders({ header }) {
            return headersMapping[header] || null;
          },
        }),
      )
      .on('data', (row: RowElu) => {
        const elu: Elu = eluUtils.prepare(row);
        const mandat: Mandat = mandatUtils.prepare(row);
        const eluId: string = `${elu.dateNaissance}@${elu.sexe}@${normalizeStr(elu.nomNaissance)}@${normalizeStr(elu.prenom)}`;
        if (!elus[eluId]) {
          elus[eluId] = elu;
        }
        elus[eluId].mandats.push(mandat);
      })
      .on('end', () => {
        resolve(Object.values(elus));
      });
  });
}

async function main() {
  const elus: Elu[] = await loadElus();
  await outputFile(
    'elus.json',
    '[\n' + elus.map((item) => JSON.stringify(item)).join(',\n') + ']\n',
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
