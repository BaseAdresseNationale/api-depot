import { CustomRequest } from '@/lib/types/request.type';
import {
  HttpException,
  HttpStatus,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import * as hash from 'hasha';

@Injectable()
export class FileBinaryPipe implements PipeTransform {
  async transform(req: CustomRequest) {
    if (
      !Buffer.isBuffer(req.fileBuffer) ||
      Buffer.byteLength(req.fileBuffer) <= 0
    ) {
      throw new HttpException('Fichier non fourni.', HttpStatus.NOT_FOUND);
    }

    if (req.get('Content-MD5')) {
      const signature = await hash(req.fileBuffer, { algorithm: 'md5' });

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

    if (
      req.get('Content-Type') &&
      req.get('Content-Type') !== 'text/csv' &&
      req.get('Content-Type') !== 'application/octet-stream'
    ) {
      throw new HttpException(
        'Le type du contenue dans l’en-tête ne peut être que text/csv.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      req.get('Content-Length') &&
      Number(req.get('Content-Length')) !== Buffer.byteLength(req.fileBuffer)
    ) {
      throw new HttpException(
        'La longueur de contenue dans l’en-tête ne correspond pas a la taille en octet du fichier.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return req.fileBuffer;
  }
}
