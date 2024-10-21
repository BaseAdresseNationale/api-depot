import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsSelect, FindOptionsWhere, Repository } from 'typeorm';
import { Mandataire } from './mandataire.entity';

@Injectable()
export class MandataireService {
  constructor(
    @InjectRepository(Mandataire)
    private mandataireRepository: Repository<Mandataire>,
  ) {}

  async findMany(
    where: FindOptionsWhere<Mandataire>,
    select?: FindOptionsSelect<Mandataire>,
  ): Promise<Mandataire[]> {
    return this.mandataireRepository.find({
      where,
      ...(select && { select }),
    });
  }

  public async findOneOrFail(mandataireId: string): Promise<Mandataire> {
    const where: FindOptionsWhere<Mandataire> = {
      id: mandataireId,
    };
    const organization = await this.mandataireRepository.findOne({
      where,
      withDeleted: true,
    });

    if (!organization) {
      throw new HttpException(
        `Mandataire ${mandataireId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return organization;
  }

  public async createOne(payload: Partial<Mandataire>): Promise<Mandataire> {
    const entityToSave: Mandataire = this.mandataireRepository.create(payload);
    return this.mandataireRepository.save(entityToSave);
  }

  public async updateOne(
    mandataireId: string,
    changes: Partial<Mandataire>,
  ): Promise<Mandataire> {
    const numeroToSave: Mandataire = this.mandataireRepository.create({
      id: mandataireId,
      ...changes,
    });

    return this.mandataireRepository.save(numeroToSave);
  }
}
