import { Elu } from '../../src/lib/types/elu.type';
import { RowElu } from '.';
import { normalizeDate } from './util';
import { invert } from 'lodash';

export const headersMapping = invert({
  sexe: 'Code sexe',
  nomComplet: "Nom de l'élu",
  prenom: "Prénom de l'élu",
  dateNaissance: 'Date de naissance',
});

const SEPARATEURS_NOMS = [
  'EPOUX',
  'ÉPOUX',
  'EPOUSE',
  'ÉPOUSE',
  'VEUF',
  'VEUVE',
];

function splitWith(
  words: string[],
  separateur: string,
): {
  nomNaissance: string;
  nomMarital: string;
} {
  const index = words.indexOf(separateur);
  if (index <= 0 || index === words.length - 1) {
    return null;
  }

  return {
    nomNaissance: words.slice(0, index).join(' '),
    nomMarital: words.slice(index + 1).join(' '),
  };
}

function splitNom(nomComplet: string): {
  nomNaissance: string;
  nomMarital?: string;
} {
  const words: string[] = nomComplet.toUpperCase().split(' ');
  if (words.length >= 3) {
    const splitResults = SEPARATEURS_NOMS.map((separateur) =>
      splitWith(words, separateur),
    ).filter(Boolean);
    if (splitResults.length > 0) {
      return splitResults[0];
    }
  }

  return { nomNaissance: words.join(' ') };
}

export function prepare({
  sexe,
  dateNaissance,
  nomComplet,
  prenom,
}: RowElu): Elu {
  if (!sexe || !dateNaissance || !nomComplet || !prenom) {
    return null;
  }

  const normalizedDateNaissance: string = normalizeDate(dateNaissance);
  const { nomNaissance } = splitNom(nomComplet);

  return {
    sexe,
    nomNaissance,
    prenom,
    dateNaissance: normalizedDateNaissance,
    codeCommune: [],
  };
}
