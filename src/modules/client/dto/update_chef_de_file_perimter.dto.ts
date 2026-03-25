import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Perimeter } from '@/modules/chef_de_file/perimeters.entity';

export class UpdateChefDeFilePerimeterDTO {
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Perimeter)
  @ApiProperty({
    type: () => Perimeter,
    isArray: true,
    required: true,
    nullable: false,
  })
  perimeters?: Perimeter[];
}
