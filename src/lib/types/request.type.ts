import { Request } from 'express';
import { ChefDeFile } from 'src/modules/chef_de_file/chef_de_file.schema';
import { Client } from 'src/modules/client/client.schema';
import { Habilitation } from 'src/modules/habilitation/habilitation.schema';
import { Mandataire } from 'src/modules/mandataire/mandataire.schema';
import { Revision } from 'src/modules/revision/revision.schema';

export interface CustomRequest extends Request {
  token?: string;
  isAdmin?: boolean;
  codeCommune: string;
  client?: Client;
  mandataire?: Mandataire;
  chefDeFile?: ChefDeFile;
  habilitation?: Habilitation;
  habilitationId?: string;
  redirectUrl?: string;
  user: { idToken: string };
  revision: Revision;
}
