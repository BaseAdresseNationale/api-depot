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
import { CustomRequest } from 'src/lib/types/request.type';
import { Mandataire } from './mandataire.schema';
import { Response } from 'express';
import { AdminGuard } from 'src/lib/class/guards/admin.guard';
import { UpdateMandataireDTO } from './dto/update_mandataire.dto';
import { MandataireService } from './mandataire.service';

@ApiTags('mandataires')
@Controller('mandataires')
export class MandataireController {
  constructor(private mandataireService: MandataireService) {}

  @Get('')
  @ApiOperation({
    summary: 'Find all mandataires',
    operationId: 'findMany',
  })
  @ApiResponse({ status: HttpStatus.OK, type: Mandataire, isArray: true })
  async findMany(@Res() res: Response) {
    const mandataires: Mandataire[] = await this.mandataireService.findMany({});
    res.status(HttpStatus.OK).json(mandataires);
  }

  @Post('')
  @ApiOperation({
    summary: 'create one mandataire',
    operationId: 'createOne',
  })
  @ApiBody({ type: UpdateMandataireDTO, required: true })
  @ApiResponse({ status: HttpStatus.OK, type: Mandataire })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async createOne(@Req() req: CustomRequest, @Res() res: Response) {
    const mandataire: Mandataire = await this.mandataireService.updateOne(
      req.mandataire._id.toString(),
      req.body,
    );
    res.status(HttpStatus.OK).json(mandataire);
  }

  @Get(':mandataireId')
  @ApiOperation({
    summary: 'Find one mandataire',
    operationId: 'findOne',
  })
  @ApiParam({ name: 'mandataireId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: Mandataire })
  async findOne(@Req() req: CustomRequest, @Res() res: Response) {
    res.status(HttpStatus.OK).json(req.mandataire);
  }

  @Put(':mandataireId')
  @ApiOperation({
    summary: 'update one mandataire',
    operationId: 'updateOne',
  })
  @ApiParam({ name: 'mandataireId', required: true, type: String })
  @ApiBody({ type: UpdateMandataireDTO, required: true })
  @ApiResponse({ status: HttpStatus.OK, type: Mandataire })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async updateOne(@Req() req: CustomRequest, @Res() res: Response) {
    const mandataire: Mandataire = await this.mandataireService.updateOne(
      req.mandataire._id.toString(),
      req.body,
    );
    res.status(HttpStatus.OK).json(mandataire);
  }
}
