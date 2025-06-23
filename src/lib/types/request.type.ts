import { Request } from 'express';

import { Habilitation } from '@/modules/habilitation/habilitation.entity';
import { Revision } from '@/modules/revision/revision.entity';
import { UserFranceConnect } from './user_france_connect.type';
import { ChefDeFile } from '@/modules/chef_de_file/chef_de_file.entity';
import { Mandataire } from '@/modules/mandataire/mandataire.entity';
import { Client } from '@/modules/client/client.entity';
import { ProConnectUser } from '@/modules/habilitation/pro_connect/pro_connect_user.type';
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
  user: UserFranceConnect | ProConnectUser;
  revision: Revision;
  fileBuffer: Buffer;
}
