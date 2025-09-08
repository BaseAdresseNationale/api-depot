import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class Metrics {
  tu: number;
  yau: number;
  mau: number;
  wau: number;
}

export class MetricsCommune {
  @ApiProperty()
  insee: string;

  @Type(() => Metrics)
  @ApiProperty({ type: () => Metrics, isArray: true })
  metrics: Metrics;
}

export class MetricsIncubateurDTO {
  @ApiProperty()
  count?: number;

  @Type(() => MetricsCommune)
  @ApiProperty({ type: () => MetricsCommune, isArray: true })
  results?: MetricsCommune[];
}

export class OffsetDTO {
  @ApiProperty({ default: 0, required: false })
  offset: number;
}

export class LimitDTO {
  @ApiProperty({ default: 1000, required: false })
  limit: number;
}
