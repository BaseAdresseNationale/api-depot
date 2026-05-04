import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  ParseArrayPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  OmitType,
} from '@nestjs/swagger';
import { Response } from 'express';

import { CustomRequest } from '@/lib/types/request.type';
import { ParseDatePipe } from '@/lib/class/pipes/date.pipe';
import { FileService } from '@/modules/file/file.service';
import { Revision, StatusRevisionEnum } from './revision.entity';
import { RevisionService } from './revision.service';
import { RevisionWithClientDTO } from './dto/revision_with_client.dto';
import { RevisionQueryDto } from './dto/status_revisions.dto';
import { AnciennesCommunesDTO } from './dto/ancienne_commune.dto';
import { ValidationCogPipe } from '@/lib/class/pipes/validation_cog.pipe';
import { AdminGuard } from '@/lib/class/guards/admin.guard';
import { ClientService } from '../client/client.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('revisions')
@Controller('')
export class RevisionController {
  constructor(
    private revisionService: RevisionService,
    private fileService: FileService,
    private clientService: ClientService,
    private configService: ConfigService,
  ) {}

  @Get('current-revisions')
  @ApiOperation({
    summary: 'Find current revision by Commune',
    operationId: 'findCurrent',
  })
  @ApiQuery({ name: 'publishedSince', required: false, type: Date })
  @ApiQuery({
    name: 'codesCommunes',
    required: false,
    type: String,
    isArray: true,
  })
  @ApiResponse({ status: HttpStatus.OK, type: RevisionWithClientDTO })
  async findCurrents(
    @Query('publishedSince', ParseDatePipe)
    publishedSince: Date,
    @Query(
      'codesCommunes',
      new ParseArrayPipe({ optional: true }),
      ValidationCogPipe,
    )
    codesCommunes: string[],
    @Res()
    res: Response,
  ) {
    const revisions: Revision[] = await this.revisionService.findCurrents(
      publishedSince,
      codesCommunes,
    );
    const revisionsWithClients: RevisionWithClientDTO[] =
      await this.revisionService.expandsWithClients(revisions);
    res.status(HttpStatus.OK).json(revisionsWithClients);
  }

  @Get('communes/:codeCommune/current-revision')
  @ApiOperation({
    summary: 'Find current revision by Commune',
    operationId: 'findCommuneCurrent',
  })
  @ApiQuery({ type: AnciennesCommunesDTO })
  @ApiParam({ name: 'codeCommune', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: RevisionWithClientDTO })
  async findCurrent(@Req() req: CustomRequest, @Res() res: Response) {
    const revision: Revision = await this.revisionService.findCurrent(
      req.params.codeCommune,
    );

    const currentRevision: RevisionWithClientDTO =
      await this.revisionService.expandWithClientAndFile(revision);
    res.status(HttpStatus.OK).json(currentRevision);
  }

  @Get('communes/:codeCommune/revisions')
  @ApiOperation({
    summary: 'Find revisions by Commune',
    operationId: 'findByCommune',
  })
  @ApiParam({ name: 'codeCommune', required: true, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    type: RevisionWithClientDTO,
    isArray: true,
  })
  async findByCommune(
    @Req() req: CustomRequest,
    @Res() res: Response,
    @Query() query: RevisionQueryDto,
  ) {
    let statusQuery: { status?: StatusRevisionEnum } = {
      status: StatusRevisionEnum.PUBLISHED,
    };
    if (query.status === 'all') {
      statusQuery = {};
    } else if (query.status) {
      statusQuery = { status: query.status };
    }
    const revisions: Revision[] = await this.revisionService.findMany({
      codeCommune: req.params.codeCommune,
      ...statusQuery,
    });
    const revisionsWithClients: RevisionWithClientDTO[] =
      await this.revisionService.expandsWithClients(revisions);
    res.status(HttpStatus.OK).json(revisionsWithClients);
  }

  @Get('communes/:codeCommune/current-revision/files/bal/download')
  @ApiOperation({
    summary: 'Download file current revision by Commune',
    operationId: 'DownloadFileCurrent',
  })
  @ApiParam({ name: 'codeCommune', required: true, type: String })
  @ApiQuery({ type: AnciennesCommunesDTO })
  async downloadFileCurrent(@Req() req: CustomRequest, @Res() res: Response) {
    const revision: Revision = await this.revisionService.findCurrent(
      req.params.codeCommune,
    );
    const data: Buffer = await this.fileService.findDataByRevision(revision.id);

    res.attachment(`bal-${revision.codeCommune}.csv`);
    res.setHeader('Content-Type', 'text/csv');
    res.send(data);
  }

  @Get('revisions-lasts-pending')
  @ApiOperation({
    summary: 'Find lasts revisions pending',
    operationId: 'findLastsRevisionInPending',
  })
  @ApiQuery({ name: 'page', required: false, schema: { type: 'number' } })
  @ApiQuery({ name: 'limit', required: false, schema: { type: 'number' } })
  async findLastsRevisionInPending(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Res() res: Response,
  ) {
    const lastsRevisionsPending =
      await this.revisionService.findLastsRevisionInPending(page, limit);

    res.status(HttpStatus.OK).json(lastsRevisionsPending);
  }

  @Get('revisions/:revisionId')
  @ApiOperation({
    summary: 'Find one revision',
    operationId: 'findOne',
  })
  @ApiParam({ name: 'revisionId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: RevisionWithClientDTO })
  async findOne(@Req() req: CustomRequest, @Res() res: Response) {
    const revisionWithClient: RevisionWithClientDTO =
      await this.revisionService.expandWithClientAndFile(req.revision);
    res.status(HttpStatus.OK).json(revisionWithClient);
  }

  @Get('revisions/client/:clientId')
  @ApiOperation({
    summary: 'Find first revision bu commune by client',
    operationId: 'findLastsByClient',
  })
  @ApiParam({ name: 'clientId', required: true, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OmitType(Revision, [
      'client',
      'clientId',
      'context',
      'habilitation',
      'files',
      'createdAt',
      'updatedAt',
    ]),
  })
  async findLastsByClient(@Req() req: CustomRequest, @Res() res: Response) {
    const revisionsByClient = await this.revisionService.findLastsByClient(
      req.client,
    );

    res.status(HttpStatus.OK).json(revisionsByClient);
  }

  @Get('revisions/:revisionId/files/bal/download')
  @ApiParam({ name: 'revisionId', required: true, type: String })
  @ApiOperation({
    summary: 'Download file revision',
    operationId: 'DownloadFileRevision',
  })
  async downloadFile(@Req() req: CustomRequest, @Res() res: Response) {
    if (req.revision.status !== StatusRevisionEnum.PUBLISHED) {
      throw new HttpException(
        "La révision n'est pas encore accessible car non publiée",
        HttpStatus.FORBIDDEN,
      );
    }
    const data: Buffer = await this.fileService.findDataByRevision(
      req.revision.id,
    );

    res.attachment(`bal-${req.revision.codeCommune}.csv`);
    res.setHeader('Content-Type', 'text/csv');
    res.send(data);
  }

  @Post('revisions/:revisionId/sync-ids-ban-publish')
  @ApiParam({ name: 'revisionId', required: true, type: String })
  @ApiOperation({
    summary: 'Synchro ids BAL with ids BAN and publish',
    operationId: 'syncIdsBANPublish',
  })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  @ApiResponse({
    status: HttpStatus.OK,
    type: Revision,
  })
  async syncIdsBANPublish(@Req() req: CustomRequest, @Res() res: Response) {
    try {
      const { file: csvFileSync, codeCommune } =
        await this.revisionService.syncIdsBAN(req.revision);

      const clienBalAdmin = await this.clientService.findOneOrFail(
        this.configService.get('ID_CLIENT_BAL_ADMIN'),
      );
      const newRevisionFirstStep: Revision =
        await this.revisionService.createOne(codeCommune, clienBalAdmin, {
          nomComplet: 'ANCT',
          organisation: 'ANCT',
          extras: {
            sourceRevisionId: req.revision.id,
          },
        });
      await this.revisionService.setFile(newRevisionFirstStep, csvFileSync);
      const newRevisionSecondStep: Revision =
        await this.revisionService.computeOne(
          newRevisionFirstStep,
          clienBalAdmin,
        );
      const newRevisionFinalStep: Revision =
        await this.revisionService.publishOneWithLock(
          newRevisionSecondStep,
          clienBalAdmin,
        );
      res.status(HttpStatus.OK).send(newRevisionFinalStep);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
