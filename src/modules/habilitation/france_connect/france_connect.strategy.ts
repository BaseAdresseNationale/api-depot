import { PassportStrategy } from '@nestjs/passport';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Strategy } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';
import { callbackify } from 'util';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { UserFranceConnect } from '@/lib/types/user_france_connect.type';
import { catchError, firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class FranceConnectStrategy extends PassportStrategy(
  Strategy,
  'oauth2',
) {
  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    super(
      {
        authorizationURL:
          configService.get('FC_SERVICE_URL') + '/api/v1/authorize',
        tokenURL: configService.get('FC_SERVICE_URL') + '/api/v1/token',
        clientID: configService.get('FC_FS_ID'),
        clientSecret: configService.get('FC_FS_SECRET'),
        callbackURL: configService.get('FC_FS_CALLBACK'),
        state: 'foobar',
        scope: ['openid', 'profile'],
      },
      (accessToken, refreshToken, params, profile, done) => {
        profile.idToken = params.id_token;
        console.log('PROFILE', profile);
        done(null, profile);
      },
    );
  }

  authorizationParams = function () {
    return { nonce: 'foobar' };
  };

  userProfile = callbackify(async (token) => {
    console.log('callbackify');
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
          console.error(error);
          throw new HttpException(
            'Impossible de récupérer le profile',
            HttpStatus.FAILED_DEPENDENCY,
          );
        }),
      ),
    );
    console.log(data);
    return data;
  });
}
