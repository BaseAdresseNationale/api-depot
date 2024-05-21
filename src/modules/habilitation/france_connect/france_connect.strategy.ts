import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Strategy } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FranceConnectStrategy extends PassportStrategy(
  Strategy,
  'oauth2',
) {
  constructor(private configService: ConfigService) {
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
        done(null, profile);
      },
    );
  }

  authorizationParams = function () {
    return { nonce: 'foobar' };
  };
}
