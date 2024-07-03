export enum TYPE_MANDAT {
  CONSEILLER_MUNICIPAL = 'conseiller-municipal',
}

export interface Elu {
  sexe: 'M' | 'F';
  nomNaissance: string;
  prenom: string;
  dateNaissance: string;
  codeCommune: string[];
}
