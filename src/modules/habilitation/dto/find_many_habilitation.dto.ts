import { ApiProperty } from '@nestjs/swagger';

export class FindManyHabilitationDTO {
  @ApiProperty({ required: true, nullable: false })
  ids?: string[];
}
