import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class PublishDTO {
  @IsMongoId()
  @ApiProperty({
    type: String,
    required: false,
  })
  habilitationId?: string;
}
