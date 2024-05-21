import { Injectable } from '@nestjs/common';

import { getCommune } from '@/lib/utils/cog';
import { formatEmail as createNotifyPartnersOnForcePublishEmail } from '@/modules/mailer/templates/notify-partners-on-force-publish';
import { Client } from '@/modules/client/client.schema';
import { ChefDeFileService } from '@/modules/chef_de_file/chef_de_file.service';
import { ClientService } from '@/modules/client/client.service';
import { MandataireService } from '@/modules/mandataire/mandataire.service';
import { MailerService } from '@/modules/mailer/mailer.service';
import { Revision } from './revision.schema';

const MANAGED_CLIENTS = {
  MES_ADRESSES: 'mes-adresses',
  MOISSONNEUR_BAL: 'moissonneur-bal',
  FORMULAIRE_PUBLICATION: 'formulaire-publication',
  GUICHET_ADRESSE: 'guichet-adresse',
};

@Injectable()
export class NotifyService {
  constructor(
    private clientService: ClientService,
    private chefDeFileService: ChefDeFileService,
    private mandataireService: MandataireService,
    private mailerService: MailerService,
  ) {}

  private wasPublishedByManagedClient(client: Client) {
    return Object.values(MANAGED_CLIENTS).includes(client.id);
  }

  public async onForcePublish(
    prevRevision: Revision,
    currentRevision: Revision,
  ) {
    // Pas d'envoie si il s'agit d'une première publication
    if (!prevRevision) {
      return;
    }

    try {
      const currentClient: Client = await this.clientService.findOneOrFail(
        currentRevision.client,
      );
      const prevClient: Client = await this.clientService.findOneOrFail(
        prevRevision.client,
      );

      // On n'envoie pas de mail si la révision antérieure avait été publiée
      // par un de nos clients (Mes-adresses, Moissonneur, Formulaire, Guichet)
      if (
        !currentClient ||
        !prevClient ||
        this.wasPublishedByManagedClient(prevClient)
      ) {
        return;
      }

      // On envoie un mail si la révision courante a été publiée par mes-adresses ou formulaire
      // et que la révision antérieure avait été par un client non géré
      if (
        currentClient.id === MANAGED_CLIENTS.MES_ADRESSES ||
        currentClient.id === MANAGED_CLIENTS.FORMULAIRE_PUBLICATION
      ) {
        const chefDeFile = await this.chefDeFileService.findOneOrFail(
          prevClient.chefDeFile,
        );
        const mandataire = await this.mandataireService.findOneOrFail(
          prevClient.mandataire,
        );
        const contactEmail: string = chefDeFile?.email || mandataire?.email;
        if (contactEmail) {
          const commune = getCommune(currentRevision.codeCommune);
          const balId = currentRevision.context?.extras?.balId;

          const email = createNotifyPartnersOnForcePublishEmail({
            commune,
            balId,
          });
          await this.mailerService.sendMail(email, [contactEmail]);
        }
      }
    } catch (error) {
      console.error(error);
    }
  }
}
