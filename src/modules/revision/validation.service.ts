import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { version as validatorVersion } from '@ban-team/validateur-bal/package.json';

import { communeIsInPerimeters } from '@/lib/utils/perimeters.utils';
import { ChefDeFileService } from '@/modules/chef_de_file/chef_de_file.service';
import { RevisionService } from './revision.service';
import { Validation } from './revision.entity';
import { Client } from '../client/client.entity';
import { ValidateurApiService } from '../validateur_api/validateur_api.service';
import {
  FileUploadDTO,
  ProfileErrorDTO,
  ValidateProfileDTO,
  ValidateRowDTO,
} from '../validateur_api/type';

@Injectable()
export class ValidationService {
  constructor(
    private chefDeFileService: ChefDeFileService,
    @Inject(forwardRef(() => RevisionService))
    private revisionService: RevisionService,
    private validateurApiService: ValidateurApiService,
  ) {}

  private getRowCodeCommune(row: ValidateRowDTO): string {
    if (row.parsedValues.commune_insee) {
      return row.parsedValues.commune_insee as string;
    }

    if (row.additionalValues.cle_interop) {
      return row.additionalValues.cle_interop.codeCommune;
    }
  }

  private checkIsSameCommune(rows: ValidateRowDTO[], codeCommune: string) {
    return rows.every((r) => this.getRowCodeCommune(r) === codeCommune);
  }

  private async checkIsInPerimetre(codeCommune: string, client: Client) {
    if (client?.chefDeFileId) {
      const chefDeFile = await this.chefDeFileService.findOneOrFail(
        client.chefDeFileId,
      );
      return (
        chefDeFile.perimeters &&
        communeIsInPerimeters(codeCommune, chefDeFile.perimeters)
      );
    }

    return true;
  }

  async checkRemoveLotNumeros(
    codeCommune: string,
    rowsCount: number,
  ): Promise<boolean> {
    try {
      const currentRevision =
        await this.revisionService.findCurrent(codeCommune);

      const nbRows = currentRevision?.validation?.rowsCount || 0;
      const newNbRows = rowsCount;
      // REMOVE > 20%
      return nbRows * 0.2 < nbRows - newNbRows;
    } catch {
      return false;
    }
  }

  public async validate(
    fileData: Buffer,
    codeCommune: string,
    client: Client,
  ): Promise<Validation> {
    const { parseOk, parseErrors, profilErrors, rows }: ValidateProfileDTO =
      await this.validateurApiService.validateFile(
        fileData,
        client?.isRelaxMode
          ? FileUploadDTO.profile._1_3_RELAX
          : FileUploadDTO.profile._1_3,
      );
    if (!parseOk) {
      return {
        valid: false,
        validatorVersion,
        parseErrors,
      };
    }

    const errors: string[] = profilErrors
      .filter(({ level }) => level === ProfileErrorDTO.level.E)
      .map(({ code }) => code);
    const warnings: string[] = profilErrors
      .filter(({ level }) => level === ProfileErrorDTO.level.W)
      .map(({ code }) => code);
    const infos: string[] = profilErrors
      .filter(({ level }) => level === ProfileErrorDTO.level.I)
      .map(({ code }) => code);

    if (!this.checkIsSameCommune(rows, codeCommune)) {
      errors.push('commune_insee.valeur_inattendue');
    }
    if (!(await this.checkIsInPerimetre(codeCommune, client))) {
      errors.push('commune_insee.out_of_perimeter');
    }

    const rowsCount: number = rows.length;
    if (await this.checkRemoveLotNumeros(codeCommune, rowsCount)) {
      warnings.push('rows.delete_many_addresses');
    }

    return {
      valid: errors.length === 0,
      validatorVersion,
      errors,
      warnings,
      infos,
      rowsCount,
    };
  }
}
