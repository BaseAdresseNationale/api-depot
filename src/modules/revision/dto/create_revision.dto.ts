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
  @ApiProperty({ type: String, required: true })
  nomComplet?: string;

  @IsString()
  @IsDefined()
  @ApiProperty({ type: String, required: true })
  organisation?: string;

  @IsObject()
  @IsNotEmptyObject()
  @ApiProperty({ type: () => Object, required: true })
  extra?: Record<string, any>;
}

export class CreateRevisionDTO {
  @IsDefined()
  @IsNotEmptyObject()
  @ValidateNested({ each: true })
  @Type(() => ContextDTO)
  @ApiProperty({ type: () => ContextDTO, required: true })
  context?: ContextDTO;
}
