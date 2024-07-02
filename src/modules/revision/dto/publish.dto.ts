import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';

export class PublishDTO {
  @IsOptional()
  @IsMongoId()
  @ApiProperty({
    type: String,
    required: false,
  })
  habilitationId?: string;
}
