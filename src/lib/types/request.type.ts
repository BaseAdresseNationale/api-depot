import { Request } from 'express';

import { ChefDeFile } from '@/modules/chef_de_file/chef_de_file.schema';
import { Client } from '@/modules/client/client.schema';
import { Habilitation } from '@/modules/habilitation/habilitation.schema';
import { Mandataire } from '@/modules/mandataire/mandataire.schema';
import { Revision } from '@/modules/revision/revision.schema';

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
  fileBuffer: Buffer;
}
