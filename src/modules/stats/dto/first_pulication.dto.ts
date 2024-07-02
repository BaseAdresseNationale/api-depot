import { ApiProperty } from '@nestjs/swagger';

export class FirstPublicationDTO {
  @ApiProperty({ required: true, nullable: false })
  date: string;

  @ApiProperty({ required: true, nullable: false })
  totalCreations: number;

  @ApiProperty({ required: true, nullable: false })
  viaMesAdresses: number;

  @ApiProperty({ required: true, nullable: false })
  viaMoissonneur: number;
}
