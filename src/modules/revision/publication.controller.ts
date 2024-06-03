import {
  Controller,
  HttpStatus,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';

import { CustomRequest } from '@/lib/types/request.type';
import { ClientGuard } from '@/lib/class/guards/client.guard';
import { RevisionGuard } from '@/lib/class/guards/revision.guard';
import { File } from '@/modules/file/file.schema';
import { Revision } from './revision.schema';
import { RevisionService } from './revision.service';
import { RevisionWithClientDTO } from './dto/revision_with_client.dto';
import { CreateRevisionDTO } from './dto/create_revision.dto';
import { FileBinary } from '@/lib/class/decorators/file_binary.decorator';
import { FileBinaryPipe } from '@/lib/class/pipes/file_binary.pipe';
import { FileBinaryInterceptor } from '@/lib/class/interceptors/file_binary.interceptor';
import { PublishDTO } from './dto/publish.dto';

@ApiTags('publications')
@Controller('')
export class PublicationController {
  constructor(private revisionService: RevisionService) {}

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
      req.codeCommune,
      req.client,
      req.body.context,
    );
    const revisionWithClient: RevisionWithClientDTO =
      await this.revisionService.expandWithClient(revision);
    res.status(HttpStatus.CREATED).json(revisionWithClient);
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
  @UseInterceptors(FileBinaryInterceptor)
  @UseGuards(ClientGuard, RevisionGuard)
  async setfile(
    @FileBinary(FileBinaryPipe) fileBuffer: Buffer,
    @Req() req: CustomRequest,
    @Res() res: Response,
  ) {
    const file: File = await this.revisionService.setFile(
      req.revision,
      fileBuffer,
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
      await this.revisionService.expandWithClient(revision, true);
    res.status(HttpStatus.OK).json(revisionWithClient);
  }

  @Post('revisions/:revisionId/publish')
  @ApiOperation({
    summary: 'publish revision',
    operationId: 'publishOne',
  })
  @ApiParam({ name: 'revisionId', required: true, type: String })
  @ApiBody({ type: PublishDTO })
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
      await this.revisionService.expandWithClient(revision, true);
    res.status(HttpStatus.OK).json(revisionWithClient);
  }
}
