import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as getRawBody from 'raw-body';
import { Request } from 'express';
import * as hash from 'hasha';
import * as bytes from 'bytes';

const MAX_BUFFER: number = bytes('50mb');

@Injectable()
export class FileGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: Request = context.switchToHttp().getRequest<Request>();
    const bodyBuffer: Buffer = await getRawBody(req, { limit: MAX_BUFFER });

    if (!Buffer.isBuffer(bodyBuffer) || Buffer.byteLength(bodyBuffer) <= 0) {
      throw new HttpException('Fichier non fourni.', HttpStatus.NOT_FOUND);
    }

    if (req.get('Content-MD5')) {
      const signature = await hash(bodyBuffer, { algorithm: 'md5' });

      if (signature !== req.get('Content-MD5')) {
        throw new HttpException(
          'La valeur de l’en-tête Content-MD5 ne correspond pas à la signature MD5 du contenu soumis.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (req.get('Content-Encoding')) {
      throw new HttpException(
        'Aucun encodage de contenue dans l’en-tête n’est accepté.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (req.get('Content-Type') && req.get('Content-Type') !== 'text/csv') {
      throw new HttpException(
        'Le type du contenue dans l’en-tête ne peut être que text/csv.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      req.get('Content-Length') &&
      Number(req.get('Content-Length')) !== Buffer.byteLength(bodyBuffer)
    ) {
      throw new HttpException(
        'La longueur de contenue dans l’en-tête ne correspond pas a la taille en octet du fichier.',
        HttpStatus.BAD_REQUEST,
      );
    }

    req.body = bodyBuffer;
    return true;
  }
}
