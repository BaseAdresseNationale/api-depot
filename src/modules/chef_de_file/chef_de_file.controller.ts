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
import { Response } from 'express';
import { AdminGuard } from 'src/lib/class/guards/admin.guard';
import { UpdateChefDeFileDTO } from './dto/update_chef_de_file.dto';
import { ChefDeFileService } from './chef_de_file.service';
import { ChefDeFile } from './chef_de_file.schema';

@ApiTags('chefs_de_file')
@Controller('chefs_de_file')
export class ChefDeFileController {
  constructor(private chefDeFileService: ChefDeFileService) {}

  @Get('')
  @ApiOperation({
    summary: 'Find all chefDeFiles',
    operationId: 'findMany',
  })
  @ApiResponse({ status: HttpStatus.OK, type: ChefDeFile, isArray: true })
  async findMany(@Res() res: Response) {
    const chefDeFiles: ChefDeFile[] = await this.chefDeFileService.findMany({});
    res.status(HttpStatus.OK).json(chefDeFiles);
  }

  @Post('')
  @ApiOperation({
    summary: 'create one chefDeFile',
    operationId: 'createOne',
  })
  @ApiBody({ type: UpdateChefDeFileDTO, required: true })
  @ApiResponse({ status: HttpStatus.OK, type: ChefDeFile })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async createOne(@Req() req: CustomRequest, @Res() res: Response) {
    const chefDeFile: ChefDeFile = await this.chefDeFileService.updateOne(
      req.chefDeFile._id.toString(),
      req.body,
    );
    res.status(HttpStatus.OK).json(chefDeFile);
  }

  @Get(':chefDeFileId')
  @ApiOperation({
    summary: 'Find one chefDeFile',
    operationId: 'findOne',
  })
  @ApiParam({ name: 'chefDeFileId', required: true, type: String })
  @ApiResponse({ status: HttpStatus.OK, type: ChefDeFile })
  async findOne(@Req() req: CustomRequest, @Res() res: Response) {
    res.status(HttpStatus.OK).json(req.chefDeFile);
  }

  @Put(':chefDeFileId')
  @ApiOperation({
    summary: 'update one chefDeFile',
    operationId: 'updateOne',
  })
  @ApiParam({ name: 'chefDeFileId', required: true, type: String })
  @ApiBody({ type: UpdateChefDeFileDTO, required: true })
  @ApiResponse({ status: HttpStatus.OK, type: ChefDeFile })
  @ApiBearerAuth('admin-token')
  @UseGuards(AdminGuard)
  async updateOne(@Req() req: CustomRequest, @Res() res: Response) {
    const chefDeFile: ChefDeFile = await this.chefDeFileService.updateOne(
      req.chefDeFile._id.toString(),
      req.body,
    );
    res.status(HttpStatus.OK).json(chefDeFile);
  }
}
