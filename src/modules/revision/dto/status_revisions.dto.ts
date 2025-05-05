import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { StatusRevisionEnum } from '../revision.entity';
import { AnciennesCommunesDTO } from './ancienne_commune.dto';

export const StatusSearchEnum = {
  ...StatusRevisionEnum,
  ALL: 'all',
};

export class StatusRevisionsDTO {
  @IsOptional()
  @IsEnum(StatusSearchEnum)
  @ApiProperty({
    enum: StatusSearchEnum,
    required: false,
    description:
      'Filtre les révisions par statut, par défaut les révisions publiées',
  })
  status?: StatusRevisionEnum | 'all';
}

export class RevisionQueryDto extends IntersectionType(
  StatusRevisionsDTO,
  AnciennesCommunesDTO,
) {}
