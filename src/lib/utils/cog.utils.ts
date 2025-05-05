import { keyBy, groupBy } from 'lodash';
import * as allCommunes from '@etalab/decoupage-administratif/data/communes.json';
import * as departements from '@etalab/decoupage-administratif/data/departements.json';
import * as epci from '@etalab/decoupage-administratif/data/epci.json';

import {
  CommuneCOG,
  CommuneTypeEnum,
  DepartementCOG,
  EpciCOG,
} from '@/lib/types/cog.type';

const communes = (allCommunes as CommuneCOG[]).filter((c) =>
  [
    CommuneTypeEnum.COMMUNE_ACTUELLE,
    CommuneTypeEnum.ARRONDISSEMENT_MUNICIPAL,
  ].includes(c.type),
);

const communesIndex: Record<string, CommuneCOG> = keyBy(communes, 'code');

const codesCommunesActuelles = new Set(communes.map((c) => c.code));

const codesCommunes = new Set();
for (const commune of communes) {
  codesCommunes.add(commune.code);
  const anciensCodes = commune.anciensCodes || [];
  for (const ancienCode of anciensCodes) {
    codesCommunes.add(ancienCode);
  }
}

const departementsIndex: Record<string, DepartementCOG> = keyBy(
  departements,
  'code',
);

const epciIndex: Record<string, EpciCOG> = keyBy(epci, 'code');

const communesByDepartementIndex: Record<string, CommuneCOG[]> = groupBy(
  communes,
  'departement',
);

export function isCommune(codeCommune: string): boolean {
  return codesCommunes.has(codeCommune);
}

export function isCommuneActuelle(codeCommune: string): boolean {
  return codesCommunesActuelles.has(codeCommune);
}

export function getCommune(codeCommune: string): CommuneCOG {
  return communesIndex[codeCommune];
}

export function getCommunesByDepartement(
  codeDepartement: string,
): CommuneCOG[] {
  return communesByDepartementIndex[codeDepartement] || [];
}

export function getDepartement(codeDepartement: string): DepartementCOG {
  return departementsIndex[codeDepartement];
}

export function getEPCI(siren: string): EpciCOG {
  return epciIndex[siren];
}

export function isArrondissement(codeArrondissement: string): boolean {
  const arr = communesIndex[codeArrondissement];
  return arr && arr.type === 'arrondissement-municipal';
}
