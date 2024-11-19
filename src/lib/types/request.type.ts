import { Request } from 'express';

import { Client } from '@/modules/client/client.schema';
import { Habilitation } from '@/modules/habilitation/habilitation.schema';
import { Revision } from '@/modules/revision/revision.schema';
import { UserFranceConnect } from './user_france_connect.type';
import { ChefDeFile } from '@/modules/chef_de_file/chef_de_file.entity';
import { Mandataire } from '@/modules/mandataire/mandataire.entity';

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
  user: UserFranceConnect;
  revision: Revision;
  fileBuffer: Buffer;
}
