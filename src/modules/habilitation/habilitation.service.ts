import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import randomNumber from 'random-number-csprng';

import {
  Habilitation,
  StatusHabilitationEnum,
  TypeStrategyEnum,
} from './habilitation.schema';
import { Client } from '../client/client.schema';
import { ApiAnnuaireService } from '../api_annuraire/api_annuraire.service';
import { getCommune } from 'src/lib/utils/cog';
import { CommuneCOG } from 'src/lib/types/cog.type';
import { MailerService } from '../mailer/mailer.service';
import { formatEmail as createCodePinNotificationEmail } from '../mailer/templates/code-pin-notification';
import {
  ValidateCodePinRequestDTO,
  ValidateCodePinResponseDTO,
} from './dto/validate_code_pin.dto';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { UserFranceConnect } from 'src/lib/types/user_france_connect.type';
import { getMandatsByUser } from 'src/lib/utils/elus';
import { Mandat } from 'src/lib/types/elu.type';

@Injectable()
export class HabilitationService {
  constructor(
    @InjectModel(Habilitation.name)
    private habilitationModel: Model<Habilitation>,
    private httpService: HttpService,
    private apiAnnuaireService: ApiAnnuaireService,
    private mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  public async findOne(filter): Promise<Habilitation> {
    return await this.habilitationModel.findOne(filter).lean().exec();
  }

  public async findOneOrFail(habilitationId: string): Promise<Habilitation> {
    const habilitation = await this.habilitationModel
      .findOne({ _id: habilitationId })
      .lean()
      .exec();

    if (!habilitation) {
      throw new HttpException(
        `Habilitation ${habilitationId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return habilitation;
  }

  public async createOne(
    codeCommune: string,
    client: Client,
  ): Promise<Habilitation> {
    const _id = new ObjectId();

    const emailCommune =
      await this.apiAnnuaireService.getEmailCommune(codeCommune);

    const habilitation: Partial<Habilitation> = {
      _id,
      codeCommune,
      emailCommune,
      franceconnectAuthenticationUrl: `${this.configService.get<string>('API_DEPOT_URL')}/habilitations/${_id}/authentication/franceconnect`,
      strategy: null,
      client: client._id,
      status: StatusHabilitationEnum.PENDING,
      expiresAt: null,
    };

    const res: Habilitation = await this.habilitationModel.create(habilitation);

    return res;
  }

  public async acceptHabilitation(
    habilitationId: ObjectId,
    changes: Partial<Habilitation>,
  ): Promise<Habilitation> {
    const now = new Date();
    const habilitationEnd = new Date();
    habilitationEnd.setMonth(habilitationEnd.getMonth() + 12);

    const habilitation: Habilitation =
      await this.habilitationModel.findOneAndUpdate(
        { _id: habilitationId },
        {
          $set: {
            ...changes,
            status: StatusHabilitationEnum.ACCEPTED,
            updatedAt: now,
            acceptedAt: now,
            expiresAt: habilitationEnd,
          },
        },
      );
    return habilitation;
  }

  public async rejectHabilitation(
    habilitationId: ObjectId,
    changes: Partial<Habilitation>,
  ): Promise<Habilitation> {
    const now = new Date();
    const habilitationEnd = new Date();
    habilitationEnd.setMonth(habilitationEnd.getMonth() + 12);

    const habilitation: Habilitation =
      await this.habilitationModel.findOneAndUpdate(
        { _id: habilitationId },
        {
          $set: {
            ...changes,
            status: StatusHabilitationEnum.REJECTED,
            updatedAt: now,
            rejectedAt: now,
          },
        },
      );
    return habilitation;
  }

  private hasBeenSentRecently(sentAt: Date) {
    const now = new Date();
    const floodLimitTime = new Date(sentAt);
    floodLimitTime.setMinutes(floodLimitTime.getMinutes() + 5);
    return now < floodLimitTime;
  }

  private async generatePinCode() {
    const number = await randomNumber(0, 999_999);
    return number.toString().padStart(6, '0');
  }

  private getExpirationDate(startDate: Date) {
    const expireAt = new Date(startDate);
    expireAt.setHours(expireAt.getHours() + 24);
    return expireAt;
  }

  public async sendCodePin(habilitation: Habilitation): Promise<void> {
    if (habilitation.status === StatusHabilitationEnum.ACCEPTED) {
      throw new HttpException(
        'Cette habilitation est déjà validée',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    if (habilitation.status === StatusHabilitationEnum.REJECTED) {
      throw new HttpException(
        'Cette habilitation est rejetée',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    if (!habilitation.emailCommune) {
      throw new HttpException(
        'Impossible d’envoyer le code, aucun courriel n’est connu pour cette commune',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    if (
      habilitation.strategy &&
      this.hasBeenSentRecently(habilitation.strategy.createdAt)
    ) {
      throw new HttpException(
        'Un courriel a déjà été envoyé, merci de patienter',
        HttpStatus.CONFLICT,
      );
    }

    const now = new Date();
    const pinCode = await this.generatePinCode();

    await this.habilitationModel.findOneAndUpdate(
      { _id: habilitation._id },
      {
        $set: {
          strategy: {
            type: 'email',
            pinCode,
            pinCodeExpiration: this.getExpirationDate(now),
            remainingAttempts: 10,
            createdAt: now,
          },
        },
      },
    );
    const { nom }: CommuneCOG = getCommune(habilitation.codeCommune);

    const templateEmail = createCodePinNotificationEmail({
      pinCode,
      nomCommune: nom,
    });
    await this.mailerService.sendMail(templateEmail, [
      habilitation.emailCommune,
    ]);
  }

  public async validateCodePin(
    habilitation: Habilitation,
    { code }: ValidateCodePinRequestDTO,
  ): Promise<ValidateCodePinResponseDTO> {
    if (habilitation.status === StatusHabilitationEnum.ACCEPTED) {
      throw new HttpException(
        'Cette habilitation est déjà validée',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    if (habilitation.status === StatusHabilitationEnum.REJECTED) {
      throw new HttpException(
        'Cette habilitation est rejetée',
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    if (this.configService.get<string>('DEMO_MODE') && code === '000000') {
      return { validated: true };
    }

    if (code !== habilitation.strategy.pinCode) {
      const {
        strategy: { remainingAttempts },
      } = await this.habilitationModel.findOneAndUpdate(
        { _id: habilitation._id },
        {
          $inc: { 'strategy.remainingAttempts': -1 },
        },
      );

      if (remainingAttempts <= 0) {
        await this.habilitationModel.findOneAndUpdate(
          { _id: habilitation._id },
          {
            status: StatusHabilitationEnum.REJECTED,
            rejectedAt: new Date(),
          },
        );

        return {
          validated: false,
          error: 'Code non valide. Demande rejetée.',
          remainingAttempts: 0,
        };
      }

      const plural = remainingAttempts > 1 ? 's' : '';

      return {
        validated: false,
        error: `Code non valide, ${remainingAttempts} tentative${plural} restante${plural}`,
        remainingAttempts,
      };
    }

    const now = new Date();
    if (now > habilitation.strategy.pinCodeExpiration) {
      return {
        validated: false,
        error: 'Code expiré',
      };
    }

    return { validated: true };
  }

  private async getUserInfo(token: string): Promise<UserFranceConnect> {
    const url: string = `${this.configService.get<string>('FC_SERVICE_URL')}/api/v1/userinfo?schema=openid`;
    const options: AxiosRequestConfig = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      responseType: 'json',
    };
    const { data } = await firstValueFrom(
      this.httpService.get<UserFranceConnect>(url, options).pipe(
        catchError((error: AxiosError) => {
          throw error;
        }),
      ),
    );

    if (!data.sub) {
      throw new HttpException(
        'Cette habilitation est déjà validée',
        HttpStatus.FAILED_DEPENDENCY,
      );
    }

    return data;
  }

  public async franceConnectCallback(
    token: string,
    habilitationId: string,
  ): Promise<void> {
    const habilitation = await this.findOneOrFail(habilitationId);

    if (habilitation.status === StatusHabilitationEnum.PENDING) {
      const user = await this.getUserInfo(token);
      const mandats: Mandat[] = getMandatsByUser(user);
      const mandat: Mandat = mandats.find(
        (m) => m.codeCommune === habilitation.codeCommune,
      );
      if (mandat) {
        await this.acceptHabilitation(habilitation._id, {
          strategy: {
            type: TypeStrategyEnum.FRANCECONNECT,
            mandat,
          },
        });
      } else {
        await this.rejectHabilitation(habilitation._id, {
          strategy: {
            type: TypeStrategyEnum.FRANCECONNECT,
            authenticationError:
              'Aucun mandat valide trouvé pour cette commune',
          },
        });
      }
    }
  }
}
