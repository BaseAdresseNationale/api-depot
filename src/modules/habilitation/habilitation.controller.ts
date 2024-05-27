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
import { omit } from 'lodash';

import { CustomRequest } from '@/lib/types/request.type';
import { AdminGuard } from '@/lib/class/guards/admin.guard';
import { ClientGuard } from '@/lib/class/guards/client.guard';
import { HabilitationService } from './habilitation.service';
import { Habilitation, TypeStrategyEnum } from './habilitation.schema';
import {
  ValidateCodePinRequestDTO,
  ValidateCodePinResponseDTO,
} from './dto/validate_code_pin.dto';
import {
  FranceConnectAuthGuard,
  FranceConnectCallBackGuard,
} from './france_connect/france_connect.guard';

@ApiTags('habilitations')
@Controller('')
export class HabilitationController {
  constructor(private habilitationService: HabilitationService) {}

  @Post('communes/:codeCommune/habilitations')
  @ApiOperation({
    summary: 'create one habilitation',
    operationId: 'createOne',
  })
  @ApiParam({ name: 'codeCommune', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Habilitation })
  @ApiBearerAuth('client-token')
  @UseGuards(ClientGuard)
  async createOne(@Req() req: CustomRequest, @Res() res: Response) {
    const habilitation: Habilitation = await this.habilitationService.createOne(
      req.codeCommune,
      req.client,
    );
    res.status(HttpStatus.CREATED).json(habilitation);
  }

  @Get('habilitations/:habilitationId')
  @ApiOperation({
    summary: 'Find one habilitation',
    operationId: 'findOne',
  })
  @ApiParam({ name: 'habilitationId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Habilitation })
  @ApiBearerAuth('client-token')
  @UseGuards(ClientGuard)
  async findOne(@Req() req: CustomRequest, @Res() res: Response) {
    res.status(HttpStatus.OK).json(omit(req.habilitation, 'strategy.pinCode'));
  }

  @Put('habilitations/:habilitationId/validate')
  @ApiOperation({
    summary: 'validate habilitation',
    operationId: 'validateOne',
  })
  @ApiParam({ name: 'habilitationId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Habilitation })
  @ApiBearerAuth('client-token')
  @UseGuards(AdminGuard)
  async validateOne(@Req() req: CustomRequest, @Res() res: Response) {
    const habilitation: Habilitation =
      await this.habilitationService.acceptHabilitation(req.habilitation._id, {
        strategy: { type: TypeStrategyEnum.INTERNAL },
      });
    res.status(HttpStatus.OK).json(habilitation);
  }

  @Post('habilitations/:habilitationId/authentication/email/send-pin-code')
  @ApiOperation({
    summary: 'send pin-code habilitation',
    operationId: 'sendCodePin',
  })
  @ApiParam({ name: 'habilitationId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Habilitation })
  @ApiBearerAuth('client-token')
  @UseGuards(ClientGuard)
  async sendCodePin(@Req() req: CustomRequest, @Res() res: Response) {
    const habilitation = await this.habilitationService.sendCodePin(
      req.habilitation,
    );
    res.status(HttpStatus.OK).json(omit(habilitation, 'strategy.pinCode'));
  }

  @Post('habilitations/:habilitationId/authentication/email/validate-pin-code')
  @ApiOperation({
    summary: 'validate pin-code habilitation',
    operationId: 'validateCodePin',
  })
  @ApiParam({ name: 'habilitationId', required: true, type: String })
  @ApiBody({ type: ValidateCodePinRequestDTO, required: true })
  @ApiResponse({ status: HttpStatus.OK, type: ValidateCodePinResponseDTO })
  @ApiBearerAuth('client-token')
  @UseGuards(ClientGuard)
  async validateCodePin(@Req() req: CustomRequest, @Res() res: Response) {
    const result: ValidateCodePinResponseDTO =
      await this.habilitationService.validateCodePin(
        req.habilitation,
        req.body,
      );
    res.status(HttpStatus.OK).json(result);
  }

  @Get('habilitations/:habilitationId/authentication/franceconnect')
  @UseGuards(FranceConnectAuthGuard)
  async authentificationFranceConnect() {
    return;
  }

  // https://partenaires.franceconnect.gouv.fr/fcp/fournisseur-service
  // @Get('/callback')
  @Get('/habilitations/franceconnect/callback')
  @UseGuards(FranceConnectCallBackGuard)
  franceConnectCallback(@Req() req: CustomRequest, @Res() res: Response) {
    this.habilitationService.franceConnectCallback(
      req.user.idToken,
      req.habilitationId,
    );
    res.redirect(req.redirectUrl);
  }
}
