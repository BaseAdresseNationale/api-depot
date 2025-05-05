import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class AnciennesCommunesDTO {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @ApiProperty({
    type: Boolean,
    required: null,
    description:
      'Indique si on souhaite récupérer les révisions de toutes les communes',
    default: false,
  })
  ancienneCommuneAllowed?: boolean;
}
