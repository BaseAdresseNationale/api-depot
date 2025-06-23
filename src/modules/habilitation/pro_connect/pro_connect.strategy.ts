import { PassportStrategy } from '@nestjs/passport';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Strategy } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';
import { callbackify } from 'util';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { Logger } from '@/lib/utils/logger.utils';
import * as jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

@Injectable()
export class ProConnectStrategy extends PassportStrategy(
  Strategy,
  'pro_connect_oauth2',
) {
  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    super(
      {
        authorizationURL:
          configService.get('PC_SERVICE_URL') + '/api/v2/authorize',
        tokenURL: configService.get('PC_SERVICE_URL') + '/api/v2/token',
        clientID: configService.get('PC_FS_ID') || 'fake-client-id',
        clientSecret: configService.get('PC_FS_SECRET') || 'fake-client-secret',
        callbackURL:
          configService.get('API_DEPOT_URL') +
          '/habilitations/proconnect/callback',
        scope: ['openid', 'siret'],
        passReqToCallback: true,
      },
      (req, accessToken, refreshToken, params, profile, done) => {
        if (params.id_token) {
          const decodedToken: any = jwt.decode(params.id_token);

          if (!req.session.nonce || decodedToken.nonce !== req.session.nonce) {
            Logger.error(
              'Nonce invalide',
              { stored: req.session.nonce, received: decodedToken.nonce },
              ProConnectStrategy.name,
            );
            return done(
              new HttpException('Nonce invalide', HttpStatus.BAD_REQUEST),
              null,
            );
          }
        }

        if (!req.query.state || req.query.state !== req.session.state) {
          return done(
            new HttpException('Invalid OAuth2 state', HttpStatus.BAD_REQUEST),
            false,
          );
        }

        done(null, profile);
      },
    );
  }

  authenticate(req: any, options?: any) {
    let state = req.session.state;
    let nonce = req.session.nonce;

    if (!state && !nonce) {
      state = randomBytes(16).toString('hex');
      nonce = randomBytes(16).toString('hex');
      req.session.state = state;
      req.session.nonce = nonce;
    }
    super.authenticate(req, { ...options, state, nonce });
  }

  authorizationParams = function (options) {
    return {
      state: options.state,
      nonce: options.nonce,
    };
  };

  userProfile = callbackify(async (token) => {
    const url: string = `${this.configService.get<string>('PC_SERVICE_URL')}/api/v2/userinfo`;
    const options: AxiosRequestConfig = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      responseType: 'json',
    };

    const { data } = await firstValueFrom(
      this.httpService.get(url, options).pipe(
        catchError((error: AxiosError) => {
          Logger.error(
            `Une erreur est survenue lors de l'authentitification ProConnect`,
            error,
            ProConnectStrategy.name,
          );
          throw new HttpException(
            'Impossible de récupérer le profile',
            HttpStatus.FAILED_DEPENDENCY,
          );
        }),
      ),
    );

    try {
      const decodedToken = jwt.decode(data);
      Logger.debug('JWT décodé', decodedToken, ProConnectStrategy.name);
      return decodedToken;
    } catch (error) {
      Logger.error(
        'Erreur lors du décodage du JWT',
        error,
        ProConnectStrategy.name,
      );
      throw new HttpException(
        'Impossible de décoder le token',
        HttpStatus.BAD_REQUEST,
      );
    }
  });
}
