import { ApiProperty } from '@nestjs/swagger';

export interface PublishedBal {
  total: number;
  viaMesAdresses: number;
  viaMoissonneur: number;
}

export class PublicationDTO {
  @ApiProperty({ required: false, nullable: false })
  date: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: {
      oneOf: [
        {
          type: 'object',
          properties: {
            total: { type: 'number' },
            viaMesAdresses: { type: 'number' },
            viaMoissonneur: { type: 'number' },
          },
        },
      ],
    },
    required: false,
    nullable: false,
  })
  publishedBAL: Record<string, PublishedBal>;
}
