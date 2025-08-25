export interface LookupResponse {
  id: string;
  type: string;
  codeCommune: string;
  banId: string;
  nomCommune: string;
  departement: {
    nom: string;
    code: string;
  };
  region: {
    nom: string;
    code: string;
  };
  codesPostaux: string[];
  population: number;
  typeCommune: string; // ex: "commune-actuelle"
  nbNumeros: number;
  nbNumerosCertifies: number;
  nbVoies: number;
  nbLieuxDits: number;
  typeComposition: string; // ex: "bal"
  displayBBox: [number, number, number, number];
  idRevision: string;
  dateRevision: string; // ISO date string
  withBanId: boolean;
  voies: Voie[];
}

export interface Voie {
  id: string;
  type: 'voie';
  banId: string;
  idVoie: string;
  nomVoie: string;
  nomVoieAlt: Record<string, string>; // objet vide ou dictionnaire de traductions/alternatifs
  sourceNomVoie: string;
  sources: string[];
  nbNumeros: number;
  nbNumerosCertifies: number;
}
