export enum TYPE_MANDAT {
  CONSEILLER_MUNICIPAL = 'conseiller-municipal',
}

export interface Mandat {
  dateDebutMandat: string;
  codeCommune: string;
  typeMandat: TYPE_MANDAT.CONSEILLER_MUNICIPAL;
}

export interface Elu {
  sexe: 'M' | 'F';
  nomNaissance: string;
  prenom: string;
  dateNaissance: string;
  mandats: Mandat[];
}
