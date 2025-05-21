import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class ProConnectAuthGuard extends AuthGuard('pro_connect_oauth2') {
  canActivate(context: ExecutionContext) {
    const req = context.getArgByIndex(0);
    const res = context.getArgByIndex(1);

    if (!req.query.redirectUrl) {
      return res.status(400).send('redirectUrl param is mandatory');
    }

    req.session.habilitationId = req.params.habilitationId;
    req.session.redirectUrl = decodeURIComponent(req.query.redirectUrl);

    if (req.habilitation.status !== 'pending') {
      return res.redirect(req.session.redirectUrl);
    }
    return super.canActivate(context);
  }
}

@Injectable()
export class ProConnectCallBackGuard extends AuthGuard('pro_connect_oauth2') {
  canActivate(context: ExecutionContext) {
    const req = context.getArgByIndex(0);
    if (!req.session.habilitationId) {
      throw new HttpException(
        'Session invalide',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    req.habilitationId = req.session.habilitationId;
    req.redirectUrl = req.session.redirectUrl;

    return super.canActivate(context);
  }

  getAuthenticateOptions(context) {
    const req = context.getArgByIndex(0);
    return {
      session: false,
      failureRedirect: req.redirectUrl,
    };
  }
}
