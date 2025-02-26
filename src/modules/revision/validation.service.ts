import { Inject, Injectable, forwardRef } from '@nestjs/common';
import {
  validate,
  ValidateRowType,
  ValidateProfile,
  ErrorLevelEnum,
} from '@ban-team/validateur-bal';
import { version as validatorVersion } from '@ban-team/validateur-bal/package.json';

import { communeIsInPerimeters } from '@/lib/utils/perimeters.utils';
import { ChefDeFileService } from '@/modules/chef_de_file/chef_de_file.service';
import { RevisionService } from './revision.service';
import { Validation } from './revision.entity';
import { Client } from '../client/client.entity';

@Injectable()
export class ValidationService {
  constructor(
    private chefDeFileService: ChefDeFileService,
    @Inject(forwardRef(() => RevisionService))
    private revisionService: RevisionService,
  ) {}

  private getRowCodeCommune(row: ValidateRowType): string {
    if (row.parsedValues.commune_insee) {
      return row.parsedValues.commune_insee as string;
    }

    if (row.additionalValues.cle_interop) {
      return row.additionalValues.cle_interop.codeCommune;
    }
  }

  private checkIsSameCommune(rows: ValidateRowType[], codeCommune: string) {
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
    const { parseOk, parseErrors, profilErrors, rows }: ValidateProfile =
      (await validate(fileData, {
        profile: client?.isRelaxMode ? '1.3-relax' : '1.3',
      })) as ValidateProfile;

    if (!parseOk) {
      return {
        valid: false,
        validatorVersion,
        parseErrors,
      };
    }

    const errors: string[] = profilErrors
      .filter(({ level }) => level === ErrorLevelEnum.ERROR)
      .map(({ code }) => code);
    const warnings: string[] = profilErrors
      .filter(({ level }) => level === ErrorLevelEnum.WARNING)
      .map(({ code }) => code);
    const infos: string[] = profilErrors
      .filter(({ level }) => level === ErrorLevelEnum.INFO)
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
