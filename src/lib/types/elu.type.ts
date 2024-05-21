export interface Mandat {
  dateDebutMandat: string;
  codeCommune: string;
  typeMandat: string;
  nomCommune: string;
}

export interface Elu {
  sexe: 'M' | 'F';
  nomNaissance: string;
  prenom: string;
  dateNaissance: string;
  mandats: Mandat[];
}
