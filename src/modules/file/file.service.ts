import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import * as hasha from 'hasha';

import { S3Service } from './s3.service';
import { File, TypeFileEnum } from './file.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class FileService {
  constructor(
    @InjectRepository(File)
    private fileRepository: Repository<File>,
    private s3Service: S3Service,
    private readonly logger: Logger,
  ) {}

  /**
   * Crée un fichier BAL en l'uploadant sur S3 et en persistant ses métadonnées en base.
   *
   * Le fichier est d'abord uploadé sur S3, puis ses métadonnées (id, taille, hash SHA-256)
   * sont enregistrées en base de données avec une association à la révision.
   *
   * @param revisionId - Identifiant unique de la révision à laquelle associer le fichier
   * @param fileData - Contenu du fichier BAL au format CSV en Buffer
   * @returns Le fichier créé avec ses métadonnées (id, revisionId, type, size, hash, createdAt)
   *
   * @example
   * ```typescript
   * const csvContent = Buffer.from('cle_interop;voie_nom;numero\n75001_0001_0001;Rue de Rivoli;1');
   * const file = await fileService.createOne('507f1f77bcf86cd799439011', csvContent);
   * console.log(file.hash); // SHA-256 du contenu
   * ```
   */
  public async createOne(revisionId: string, fileData: Buffer): Promise<File> {
    const now = Date.now();
    this.logger.debug(
      `START UPLOAD FILE S3 for ${revisionId}, size ${Buffer.byteLength(fileData)} at ${new Date(now).toDateString()}`,
    );
    const id = await this.s3Service.writeFile(fileData);
    this.logger.debug(
      `END UPLOAD FILE S3 for ${revisionId} in ${Date.now() - now}`,
    );
    const entityToSave: File = this.fileRepository.create({
      id,
      revisionId,
      type: TypeFileEnum.BAL,
      size: fileData.length,
      hash: hasha(fileData, { algorithm: 'sha256' }),
    });
    return this.fileRepository.save(entityToSave);
  }

  /**
   * Recherche les métadonnées d'un fichier BAL par son identifiant de révision.
   *
   * Cette méthode ne récupère que les métadonnées stockées en base de données,
   * pas le contenu du fichier lui-même. Pour récupérer le contenu, utilisez
   * {@link findDataByRevision}.
   *
   * @param revisionId - Identifiant unique de la révision
   * @returns Les métadonnées du fichier (id, size, hash, createdAt) ou null si aucun fichier BAL n'existe
   *
   * @example
   * ```typescript
   * const file = await fileService.findOneByRevision('507f1f77bcf86cd799439011');
   * if (file) {
   *   console.log(`Fichier trouvé: ${file.size} octets, hash: ${file.hash}`);
   * }
   * ```
   */
  public async findOneByRevision(revisionId: string): Promise<File> {
    return this.fileRepository.findOne({
      where: { revisionId, type: TypeFileEnum.BAL },
    });
  }

  /**
   * Récupère le contenu complet d'un fichier BAL depuis le stockage S3.
   *
   * Cette méthode effectue deux opérations :
   * 1. Recherche les métadonnées du fichier en base via {@link findOneByRevision}
   * 2. Télécharge le contenu depuis S3 en utilisant l'identifiant du fichier
   *
   * @param revisionId - Identifiant unique de la révision
   * @returns Le contenu du fichier BAL (CSV) en Buffer, prêt à être parsé ou renvoyé au client
   * @throws {HttpException} 404 NOT_FOUND si aucun fichier BAL n'est associé à cette révision
   * @throws {HttpException} 404 NOT_FOUND si le fichier existe en base mais pas sur S3
   *
   * @example
   * ```typescript
   * try {
   *   const content = await fileService.findDataByRevision('507f1f77bcf86cd799439011');
   *   const csvString = content.toString('utf-8');
   *   // Parser le CSV...
   * } catch (error) {
   *   if (error.status === 404) {
   *     console.log('Fichier non trouvé');
   *   }
   * }
   * ```
   */
  public async findDataByRevision(revisionId: string): Promise<Buffer> {
    const file: File = await this.findOneByRevision(revisionId);

    if (!file) {
      throw new HttpException(
        `Aucun fichier de type 'bal' associé à la révision ${revisionId}`,
        HttpStatus.NOT_FOUND,
      );
    }

    const data: Buffer = await this.s3Service.getFile(file.id);
    return Buffer.from(data);
  }
}
