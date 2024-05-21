import { ApiProperty } from '@nestjs/swagger';

export class DateFromToQuery {
  @ApiProperty({ required: false, nullable: false })
  from?: string | null;

  @ApiProperty({ required: false, nullable: false })
  to?: string | null;
}
