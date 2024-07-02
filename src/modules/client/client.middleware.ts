import {
  HttpException,
  HttpStatus,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { Response, NextFunction } from 'express';

import { CustomRequest } from '@/lib/types/request.type';
import { ClientService } from './client.service';
import { Client } from './client.schema';
import { isObjectIdOrHexString } from 'mongoose';

@Injectable()
export class ClientMiddleware implements NestMiddleware {
  constructor(private clientService: ClientService) {}

  async use(req: CustomRequest, res: Response, next: NextFunction) {
    const { clientId } = req.params;
    if (clientId) {
      if (!isObjectIdOrHexString(clientId)) {
        throw new HttpException(
          `Client Id ${clientId} is not ObjectId`,
          HttpStatus.BAD_REQUEST,
        );
      }
      const client: Client = await this.clientService.findOneOrFail(clientId);
      req.client = client;
    }
    next();
  }
}
