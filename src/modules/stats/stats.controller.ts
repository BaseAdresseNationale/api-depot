import {
  Controller,
  Get,
  HttpStatus,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';

import { AdminGuard } from '@/lib/class/guards/admin.guard';
import {
  DateFromToQueryPipe,
  DateFromToQueryTransformed,
} from '@/lib/class/pipes/date_from_to.pipe';
import { DateFromToQuery } from './dto/date_to_from.dto';
import { StatService } from './stats.service';
import { FirstPublicationDTO } from './dto/first_pulication.dto';
import { PublicationDTO } from './dto/publication.dto';

@ApiTags('stats')
@Controller('stats')
export class StatController {
  constructor(private statService: StatService) {}

  @Get('firsts-publications')
  @ApiOperation({
    summary: 'Find all first publications',
    operationId: 'findFirstPublications',
  })
  @ApiQuery({ type: DateFromToQuery })
  @ApiResponse({
    status: HttpStatus.OK,
    type: FirstPublicationDTO,
    isArray: true,
  })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async findFirstPublications(
    @Query(DateFromToQueryPipe)
    dates: DateFromToQueryTransformed,
    @Res() res: Response,
  ) {
    const result: FirstPublicationDTO[] =
      await this.statService.findFirstPublications(dates);
    res.status(HttpStatus.OK).json(result);
  }

  @Get('publications')
  @ApiOperation({
    summary: 'Find publications',
    operationId: 'findPublications',
  })
  @ApiQuery({ type: DateFromToQuery })
  @ApiResponse({ status: HttpStatus.OK, type: PublicationDTO, isArray: true })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async findPublications(
    @Query(DateFromToQueryPipe)
    dates: DateFromToQueryTransformed,
    @Res() res: Response,
  ) {
    const result: PublicationDTO[] =
      await this.statService.findPublications(dates);
    res.status(HttpStatus.OK).json(result);
  }
}
