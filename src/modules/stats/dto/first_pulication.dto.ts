import { ApiProperty } from '@nestjs/swagger';

export class FirstPublicationDTO {
  @ApiProperty({ required: false, nullable: false })
  date: string;

  @ApiProperty({ required: false, nullable: false })
  totalCreations: number;

  @ApiProperty({ required: false, nullable: false })
  viaMesAdresses: number;

  @ApiProperty({ required: false, nullable: false })
  viaMoissonneur: number;
}
