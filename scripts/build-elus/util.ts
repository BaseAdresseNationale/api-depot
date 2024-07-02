import { deburr } from 'lodash';

export function normalizeDate(dateOrigine: string): string {
  if (!dateOrigine) {
    return undefined;
  }

  const [jour, mois, annee] = dateOrigine.split('/');
  return `${annee}-${mois.padStart(2, '0')}-${jour.padStart(2, '0')}`;
}

export function normalizeStr(str: string) {
  return deburr(str)
    .toUpperCase()
    .replace(/[^A-Z]/g, ' ')
    .replace(/\s+/g, '-');
}
