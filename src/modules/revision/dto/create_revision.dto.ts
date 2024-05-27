import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsDefined,
  IsNotEmptyObject,
  IsObject,
  IsString,
  ValidateNested,
} from 'class-validator';

import { Context } from '../revision.schema';

export class ContextDTO implements Context {
  @IsString()
  @IsDefined()
  @ApiProperty({ type: String, required: false })
  nomComplet?: string;

  @IsString()
  @IsDefined()
  @ApiProperty({ type: String, required: false })
  organisation?: string;

  @IsObject()
  @IsNotEmptyObject()
  @ApiProperty({ type: () => Object, required: false })
  extra?: Record<string, any>;
}

export class CreateRevisionDTO {
  @IsObject()
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => ContextDTO)
  @ApiProperty({ type: () => ContextDTO, required: true })
  context?: ContextDTO;
}
