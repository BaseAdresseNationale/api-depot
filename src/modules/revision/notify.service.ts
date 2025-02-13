import { Injectable, Logger } from '@nestjs/common';

import { getCommune } from '@/lib/utils/cog.utils';
import { ChefDeFileService } from '@/modules/chef_de_file/chef_de_file.service';
import { ClientService } from '@/modules/client/client.service';
import { MandataireService } from '@/modules/mandataire/mandataire.service';
import { MailerService } from '@nestjs-modules/mailer';
import { Revision } from './revision.entity';
import { ConfigService } from '@nestjs/config';
import { TypeStrategyEnum } from '../habilitation/habilitation.entity';
import { CommuneCOG } from '@/lib/types/cog.type';
import { Client } from '../client/client.entity';
import { InjectSlack } from 'nestjs-slack-webhook';
import { IncomingWebhook } from '@slack/webhook';

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
    private configService: ConfigService,
    private mailerService: MailerService,
    @InjectSlack() private readonly mattermostWebhookService: IncomingWebhook,
    private readonly logger: Logger,
  ) {
    this.mattermostWebhookService.send('TEST LOCAL');
  }

  private wasPublishedByManagedClient(client: Client) {
    return Object.values(MANAGED_CLIENTS).includes(client.id);
  }

  public async notifyMattermost(
    codeCommune: string,
    isUpdate: boolean,
    habilitationStrategy: TypeStrategyEnum | null,
    client: Client,
  ) {
    if (!process.env.MATTERMOST_WEBHOOK_URL) {
      return;
    }
    try {
      const commune: CommuneCOG = getCommune(codeCommune);
      const operationFr = isUpdate ? 'Mise à jour' : 'Initialisation';

      let habilitationText = '';

      if (habilitationStrategy === TypeStrategyEnum.FRANCECONNECT) {
        habilitationText = 'Habilitation via FranceConnect :fr:';
      } else if (habilitationStrategy === TypeStrategyEnum.EMAIL) {
        habilitationText = 'Habilitation par email :email:';
      }

      const meta = [`Application : ${client.nom}`, habilitationText].filter(
        Boolean,
      );

      const text = `${operationFr} d’une Base Adresse Locale - *${commune.nom}* (${commune.code})
      _${meta.join(' - ')}_`;

      await this.mattermostWebhookService.send(text);
    } catch (error) {
      this.logger.error(
        "Une erreur est survenue lors de l'envoie de la notification slack",
        NotifyService.name,
        error,
      );
    }
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
        currentRevision.clientId,
      );
      const prevClient: Client = await this.clientService.findOneOrFail(
        prevRevision.clientId,
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
          prevClient.chefDeFileId,
        );
        const mandataire = await this.mandataireService.findOneOrFail(
          prevClient.mandataireId,
        );
        const contactEmail: string = chefDeFile?.email || mandataire?.email;
        if (contactEmail) {
          const commune = getCommune(currentRevision.codeCommune);
          const balId = currentRevision.context?.extras?.balId;

          await this.mailerService.sendMail({
            to: contactEmail,
            subject: `La commune de ${commune.nom} a repris la main sur sa Base Adresse Locale`,
            template: 'partners-on-force-publish',
            bcc: this.configService.get('SMTP_BCC'),
            context: {
              apiUrl: this.configService.get('API_DEPOT_URL'),
              commune,
              balId,
            },
          });
        }
      }
    } catch (error) {
      this.logger.error(
        'Une erreur est survenue lors du forcage de publication',
        NotifyService.name,
        error,
      );
    }
  }
}
