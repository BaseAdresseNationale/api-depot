import {
  Controller,
  Get,
  HttpStatus,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';

import { AdminGuard } from '@/lib/class/guards/admin.guard';
import { CustomRequest } from '@/lib/types/request.type';
import { ClientService } from './client.service';
import { Client } from './client.schema';
import { UpdateClientDTO } from './dto/update_client.dto';

@ApiTags('clients')
@Controller('clients')
export class ClientController {
  constructor(private clientService: ClientService) {}

  @Get('')
  @ApiOperation({
    summary: 'Find all clients',
    operationId: 'findMany',
  })
  @ApiResponse({ status: HttpStatus.OK, type: Client, isArray: true })
  async findMany(@Res() res: Response) {
    const clients: Client[] = await this.clientService.findMany({});
    const clientsFiltered: Omit<Client, 'token'>[] = clients.map((c) =>
      this.clientService.filterSensitiveFields(c),
    );
    res.status(HttpStatus.OK).json(clientsFiltered);
  }

  @Post('')
  @ApiOperation({
    summary: 'create one client',
    operationId: 'createOne',
  })
  @ApiBody({ type: UpdateClientDTO, required: true })
  @ApiResponse({ status: HttpStatus.OK, type: Client })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async createOne(@Req() req: CustomRequest, @Res() res: Response) {
    const client: Client = await this.clientService.updateOne(
      req.client._id.toString(),
      req.body,
    );
    res.status(HttpStatus.OK).json(client);
  }

  @Get(':clientId')
  @ApiOperation({
    summary: 'Find one client',
    operationId: 'findOne',
  })
  @ApiParam({ name: 'clientId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Client })
  async findOne(@Req() req: CustomRequest, @Res() res: Response) {
    res.status(HttpStatus.OK).json(req.client);
  }

  @Put(':clientId')
  @ApiOperation({
    summary: 'update one client',
    operationId: 'updateOne',
  })
  @ApiParam({ name: 'clientId', required: true, type: String })
  @ApiBody({ type: UpdateClientDTO, required: true })
  @ApiResponse({ status: HttpStatus.OK, type: Client })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async updateOne(@Req() req: CustomRequest, @Res() res: Response) {
    const client: Client = await this.clientService.updateOne(
      req.client._id.toString(),
      req.body,
    );
    res.status(HttpStatus.OK).json(client);
  }
}
