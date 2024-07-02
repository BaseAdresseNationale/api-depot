export type CommuneCOG = {
  code: string;
  nom: string;
  typeLiaison: number;
  zone: string;
  arrondissement: string;
  departement: string;
  region: string;
  type: string;
  rangChefLieu: number;
  siren: string;
  codesPostaux: string[];
  population: number;
  commune?: string;
};

export type DepartementCOG = {
  code: string;
  nom: string;
  region: string;
  chefLieu: string;
  typeLiaison: number;
  zone: string;
};

export type EpciMembreCOG = {
  code: string;
  siren: string;
  nom: string;
  populationTotale: number;
  populationMunicipale: number;
};

export type EpciCOG = {
  code: string;
  nom: string;
  type: string;
  modeFinancement: string;
  populationTotale: number;
  populationMunicipalenumber;
  membres: EpciMembreCOG[];
};
