import { invert } from 'lodash';

export const headersMapping = invert({
  codeCommune: 'Code de la commune',
  dateDebutMandat: 'Date de début du mandat',
});
