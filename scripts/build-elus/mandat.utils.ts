import { invert } from 'lodash';

import { Mandat, TYPE_MANDAT } from '../../src/lib/types/elu.type';
import { RowElu } from '.';
import { normalizeDate } from './util';

export const headersMapping = invert({
  codeCommune: 'Code de la commune',
  dateDebutMandat: 'Date de début du mandat',
});

export function prepare({ codeCommune, dateDebutMandat }: RowElu): Mandat {
  return {
    typeMandat: TYPE_MANDAT.CONSEILLER_MUNICIPAL,
    codeCommune,
    dateDebutMandat: normalizeDate(dateDebutMandat),
  };
}
