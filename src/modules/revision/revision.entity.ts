import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { IdEntity } from '../../lib/class/id.entity';
import { ParseError } from '@/lib/types/validator.types';
import { Client } from '../client/client.entity';
import { Habilitation } from '../habilitation/habilitation.entity';

export enum StatusRevisionEnum {
  PENDING = 'pending',
  PUBLISHED = 'published',
}

export class Validation {
  @ApiProperty({ type: Boolean, required: false })
  valid: boolean;

  @ApiProperty({ type: String, required: false })
  validatorVersion?: string;

  @ApiProperty()
  parseErrors?: ParseError[];

  @ApiProperty({ type: String, required: false, isArray: true })
  errors?: string[];

  @ApiProperty({ type: String, required: false, isArray: true })
  warnings?: string[];

  @ApiProperty({ type: String, required: false, isArray: true })
  infos?: string[];

  @ApiProperty({ type: Number, required: false })
  rowsCount?: number;
}

export class Context {
  @ApiProperty({ type: String, required: false })
  nomComplet?: string;

  @ApiProperty({ type: String, required: false })
  organisation?: string;

  @ApiProperty({ type: () => Object, required: false })
  extras?: Record<string, any> | null;
}

@Entity({ name: 'revisions' })
export class Revision extends IdEntity {
  @Index('IDX_revision_client_id')
  @ApiProperty()
  @Column('varchar', { length: 24, name: 'client_id', nullable: false })
  clientId?: string;

  @ApiProperty()
  @Column('text', { nullable: true, name: 'code_commune' })
  codeCommune: string;

  @ApiProperty()
  @Column('boolean', { nullable: false, default: false })
  ready: boolean;

  @ApiProperty({ enum: StatusRevisionEnum })
  @Column('enum', {
    enum: StatusRevisionEnum,
    nullable: false,
    name: 'status',
    enumName: 'status_revision_enum',
  })
  status: StatusRevisionEnum;

  @ApiProperty()
  @Column('varchar', { length: 24, name: 'file_id', nullable: true })
  fileId?: string;

  @ApiProperty()
  @Column('text', { nullable: true, name: 'file_hash' })
  fileHash: string;

  @ApiProperty({ type: () => Context })
  @Column('jsonb', { nullable: true })
  context: Context;

  @ApiProperty({ type: () => Validation })
  @Column('jsonb', { nullable: true })
  validation: Validation | null;

  @ApiProperty({ type: () => Habilitation })
  @Column('jsonb', { nullable: true })
  habilitation: Habilitation | null;

  @ApiProperty()
  @Column('timestamp', { name: 'published_at', nullable: true })
  publishedAt: Date;

  @ApiProperty({ type: () => Client })
  @ManyToOne(() => Client, (c) => c.revisions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'client_id' })
  client?: Client;
}
