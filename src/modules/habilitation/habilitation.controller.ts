import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { omit } from 'lodash';

import { CustomRequest } from '@/lib/types/request.type';
import { AdminGuard } from '@/lib/class/guards/admin.guard';
import { ClientGuard } from '@/lib/class/guards/client.guard';
import { HabilitationService } from './habilitation.service';
import { Habilitation, TypeStrategyEnum } from './habilitation.entity';
import { ValidateCodePinRequestDTO } from './dto/validate_code_pin.dto';
import { HabilitationWithClientDTO } from './dto/habilitation_with_client.dto';
import { SendCodePinRequestDTO } from './dto/send_code_pin.dto';
import { ApiAnnuaireService } from '../api_annuaire/api_annuaire.service';
import { AnciennesCommunesDTO } from '../revision/dto/ancienne_commune.dto';
import {
  ProConnectAuthGuard,
  ProConnectCallBackGuard,
} from './pro_connect/pro_connect.guard';
import { ProConnectUser } from './pro_connect/pro_connect_user.type';

@ApiTags('habilitations')
@Controller('')
export class HabilitationController {
  constructor(
    private habilitationService: HabilitationService,
    private apiAnnuaireService: ApiAnnuaireService,
  ) {}

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

  @Get('communes/:codeCommune/emails')
  @ApiOperation({
    summary: 'Find many emails commune',
    operationId: 'findEmailsCommune',
  })
  @ApiParam({ name: 'codeCommune', required: true, type: String })
  @ApiQuery({ type: AnciennesCommunesDTO })
  @ApiResponse({ status: HttpStatus.OK, type: String, isArray: true })
  async findEmailsCommune(
    @Param('codeCommune') codeCommune: string,
    @Res() res: Response,
  ) {
    const emailsCommune =
      await this.apiAnnuaireService.getEmailsCommune(codeCommune);
    res.status(HttpStatus.OK).json(emailsCommune);
  }

  @Get('habilitations/:habilitationId')
  @ApiOperation({
    summary: 'Find one habilitation',
    operationId: 'findOne',
  })
  @ApiParam({ name: 'habilitationId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: HabilitationWithClientDTO })
  @ApiBearerAuth('client-token')
  @UseGuards(ClientGuard)
  async findOne(@Req() req: CustomRequest, @Res() res: Response) {
    const habilitationWithClient: HabilitationWithClientDTO =
      await this.habilitationService.expandWithClient(req.habilitation);
    res
      .status(HttpStatus.OK)
      .json(omit(habilitationWithClient, 'strategy.pinCode'));
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
      await this.habilitationService.acceptHabilitation(req.habilitation.id, {
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
  @ApiBody({ type: SendCodePinRequestDTO, required: true })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiBearerAuth('client-token')
  @UseGuards(ClientGuard)
  async sendCodePin(
    @Req() req: CustomRequest,
    @Body() { email }: SendCodePinRequestDTO,
    @Res() res: Response,
  ) {
    await this.habilitationService.sendCodePin(req.habilitation, email);
    res.sendStatus(HttpStatus.OK);
  }

  @Post('habilitations/:habilitationId/authentication/email/validate-pin-code')
  @ApiOperation({
    summary: 'validate pin-code habilitation',
    operationId: 'validateCodePin',
  })
  @ApiParam({ name: 'habilitationId', required: true, type: String })
  @ApiBody({ type: ValidateCodePinRequestDTO, required: true })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiBearerAuth('client-token')
  @UseGuards(ClientGuard)
  async validateCodePin(
    @Req() req: CustomRequest,
    @Body() body: ValidateCodePinRequestDTO,
    @Res() res: Response,
  ) {
    await this.habilitationService.validateCodePin(req.habilitation, body);
    res.sendStatus(HttpStatus.OK);
  }

  @ApiExcludeEndpoint()
  @Get('habilitations/:habilitationId/authentication/proconnect')
  @UseGuards(ProConnectAuthGuard)
  async authentificationProConnect() {
    return;
  }

  // https://partenaires.proconnect.gouv.fr/docs/fournisseur-service
  @Get('/habilitations/proconnect/callback')
  @ApiExcludeEndpoint()
  @UseGuards(ProConnectCallBackGuard)
  proConnectCallback(@Req() req: CustomRequest, @Res() res: Response) {
    this.habilitationService.proConnectCallback(
      req.user as ProConnectUser,
      req.habilitationId,
    );
    res.redirect(req.redirectUrl);
  }
}
