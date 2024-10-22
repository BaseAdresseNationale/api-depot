import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { IdEntity } from '../../lib/class/id.entity';
import { Revision } from '../revision/revision.entity';

export enum TypeFileEnum {
  BAL = 'bal',
}

@Entity({ name: 'files' })
export class File extends IdEntity {
  @Index('IDX_file_revision_id')
  @ApiProperty()
  @Column('varchar', { length: 24, name: 'revision_id', nullable: false })
  revisionId?: string;

  @ApiProperty()
  @Column('number', { nullable: true })
  size: number;

  @ApiProperty()
  @Column('text', { nullable: false, default: false })
  hash: string;

  @ApiProperty({ enum: TypeFileEnum })
  @Column('enum', {
    enum: TypeFileEnum,
    nullable: false,
    name: 'type',
    enumName: 'type_file_enum',
  })
  type: TypeFileEnum;

  @ApiProperty({ type: () => Revision })
  @ManyToOne(() => Revision, (r) => r.files, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'revision_id' })
  revision?: Revision;
}
