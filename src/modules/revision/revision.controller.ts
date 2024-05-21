import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CustomRequest } from 'src/lib/types/request.type';
import { Response } from 'express';
import { Revision, StatusRevisionEnum } from './revision.schema';
import { RevisionService } from './revision.service';
import { FileService } from '../file/file.service';
import { RevisionWithClientDTO } from './dto/revision_with_client.dto';
import { ParseDatePipe } from 'src/lib/class/pipes/date.pipe';
import { CreateRevisionDTO } from './dto/create_revision.dto';
import { ClientGuard } from 'src/lib/class/guards/client.guard';
import { RevisionGuard } from 'src/lib/class/guards/revision.guard';
import { FileGuard } from 'src/lib/class/guards/file.guard';
import { File } from '../file/file.schema';

@ApiTags('revisions')
@Controller('')
export class RevisionController {
  constructor(
    private revisionService: RevisionService,
    private fileService: FileService,
  ) {}

  @Get('current-revisions')
  @ApiOperation({
    summary: 'Find current revision by Commune',
    operationId: 'findCurrent',
  })
  @ApiQuery({ name: 'publishedSince', required: false, type: Date })
  @ApiResponse({ status: HttpStatus.OK, type: RevisionWithClientDTO })
  async findCurrents(
    @Query('publishedSince', ParseDatePipe)
    publishedSince: Date,
    @Res() res: Response,
  ) {
    const revisions: Revision[] =
      await this.revisionService.findCurrents(publishedSince);

    const revisionWithClient: RevisionWithClientDTO[] = await Promise.all(
      revisions.map((r: Revision) =>
        this.revisionService.expandCurrentRevision(r),
      ),
    );
    res.status(HttpStatus.OK).json(revisionWithClient);
  }

  @Get('communes/:codeCommune/current-revision')
  @ApiOperation({
    summary: 'Find current revision by Commune',
    operationId: 'findCurrent',
  })
  @ApiParam({ name: 'codeCommune', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: RevisionWithClientDTO })
  async findCurrent(@Req() req: CustomRequest, @Res() res: Response) {
    const revision: Revision = await this.revisionService.findCurrent(
      req.params.codeCommune,
    );

    const currentRevision: RevisionWithClientDTO =
      await this.revisionService.expandCurrentRevision(revision, true);
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
  async findByCommune(@Req() req: CustomRequest, @Res() res: Response) {
    const revisions: Revision[] = await this.revisionService.findMany({
      codeCommune: req.params.codeCommune,
    });

    const revisionWithClient: RevisionWithClientDTO[] = await Promise.all(
      revisions.map((r: Revision) =>
        this.revisionService.expandCurrentRevision(r),
      ),
    );
    res.status(HttpStatus.OK).json(revisionWithClient);
  }

  @Get('communes/:codeCommune/current-revision/files/bal/download')
  @ApiOperation({
    summary: 'Download file current revision by Commune',
    operationId: 'DownloadFileCurrent',
  })
  @ApiParam({ name: 'codeCommune', required: true, type: String })
  async downloadFileCurrent(@Req() req: CustomRequest, @Res() res: Response) {
    const revision: Revision = await this.revisionService.findCurrent(
      req.params.codeCommune,
    );
    const data: Buffer = await this.fileService.findDataByRevision(
      revision._id,
    );

    res.attachment(`bal-${revision.codeCommune}.csv`);
    res.setHeader('Content-Type', 'text/csv');
    res.send(data);
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
      await this.revisionService.expandCurrentRevision(req.revision, true);
    res.status(HttpStatus.OK).json(revisionWithClient);
  }

  @Get('revisions/:revisionId/files/bal/download')
  @ApiParam({ name: 'revisionId', required: true, type: String })
  @ApiOperation({
    summary: 'Download file current revision by Commune',
    operationId: 'DownloadFileCurrent',
  })
  async downloadFile(@Req() req: CustomRequest, @Res() res: Response) {
    if (req.revision.status !== StatusRevisionEnum.PUBLISHED) {
      throw new HttpException(
        'La révision n’est pas encore accessible car non publiée',
        HttpStatus.FORBIDDEN,
      );
    }
    const data: Buffer = await this.fileService.findDataByRevision(
      req.revision._id,
    );

    res.attachment(`bal-${req.revision.codeCommune}.csv`);
    res.setHeader('Content-Type', 'text/csv');
    res.send(data);
  }

  // PUBLICATION

  @Post('communes/:codeCommune/revisions')
  @ApiOperation({
    summary: 'create revision',
    operationId: 'createOne',
  })
  @ApiParam({ name: 'codeCommune', required: true, type: String })
  @ApiBody({ type: CreateRevisionDTO, required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    type: RevisionWithClientDTO,
  })
  @ApiBearerAuth('client-token')
  @UseGuards(ClientGuard)
  async createOne(@Req() req: CustomRequest, @Res() res: Response) {
    const revision: Revision = await this.revisionService.createOne(
      req.body,
      req.codeCommune,
      req.client,
    );
    console.log(revision);
    console.log({ ...revision });
    const revisionWithClient: RevisionWithClientDTO =
      await this.revisionService.expandCurrentRevision(revision);
    res.status(HttpStatus.OK).json(revisionWithClient);
  }

  @Put('revisions/:revisionId/files/bal')
  @ApiOperation({
    summary: 'Attach file to revision revision',
    operationId: 'uploadFile',
  })
  @ApiParam({ name: 'revisionId', required: true, type: String })
  @ApiConsumes('text/csv')
  @ApiBody({
    type: 'binary',
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: File,
  })
  @ApiBearerAuth('client-token')
  @UseGuards(ClientGuard, RevisionGuard, FileGuard)
  async setfile(@Req() req: CustomRequest, @Res() res: Response) {
    const file: File = await this.revisionService.setFile(
      req.revision,
      req.body,
    );
    res.status(HttpStatus.OK).json(file);
  }

  @Post('revisions/:revisionId/compute')
  @ApiOperation({
    summary: 'compute revision',
    operationId: 'computeOne',
  })
  @ApiParam({ name: 'revisionId', required: true, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    type: RevisionWithClientDTO,
  })
  @ApiBearerAuth('client-token')
  @UseGuards(ClientGuard, RevisionGuard)
  async computeOne(@Req() req: CustomRequest, @Res() res: Response) {
    const revision: Revision = await this.revisionService.computeOne(
      req.revision,
      req.client,
    );

    const revisionWithClient: RevisionWithClientDTO =
      await this.revisionService.expandCurrentRevision(revision, true);
    res.status(HttpStatus.OK).json(revisionWithClient);
  }

  @Post('revisions/:revisionId/publish')
  @ApiOperation({
    summary: 'publish revision',
    operationId: 'publishOne',
  })
  @ApiParam({ name: 'revisionId', required: true, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    type: RevisionWithClientDTO,
  })
  @ApiBearerAuth('client-token')
  @UseGuards(ClientGuard, RevisionGuard)
  async publishOne(@Req() req: CustomRequest, @Res() res: Response) {
    const revision: Revision = await this.revisionService.publishOne(
      req.revision,
      req.client,
      req.body.habilitationId,
    );

    const revisionWithClient: RevisionWithClientDTO =
      await this.revisionService.expandCurrentRevision(revision, true);
    res.status(HttpStatus.OK).json(revisionWithClient);
  }

  // app.post('/revisions/:revisionId/publish', authClient, authRevision, w(async (req, res) => {
  //   if (req.revision.status !== 'pending' || !req.revision.ready) {
  //     throw createError(412, 'La publication n’est pas possible')
  //   }

  //   let habilitation
  //   if (req.body.habilitationId) {
  //     habilitation = await Revision.getRelatedHabilitation(req.body.habilitationId, {
  //       client: req.client,
  //       codeCommune: req.revision.codeCommune
  //     })
  //   }

  //   const publishedRevision = await Revision.publishRevision(req.revision, {client: req.client, habilitation})
  //   const publishedRevisionWithPublicClient = await Revision.expandWithClient(publishedRevision)

  //   res.send(publishedRevisionWithPublicClient)
  // }))
}
