import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';

@Injectable()
export class ApiAnnuaireService {
  constructor(
    private readonly httpService: HttpService,
    private readonly logger: Logger,
  ) {}

  private validateEmail(email: string) {
    const re =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[(?:\d{1,3}\.){3}\d{1,3}])|(([a-zA-Z\-\d]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  }

  private async getMairies(codeCommune: string): Promise<any[]> {
    const url: string = `/catalog/datasets/api-lannuaire-administration/records?where=pivot%20LIKE%20"mairie"%20AND%20code_insee_commune="${codeCommune}"&limit=100`;
    const options: AxiosRequestConfig = { responseType: 'json' };
    const { data } = await firstValueFrom(
      this.httpService.get<any>(url, options).pipe(
        catchError((error: AxiosError) => {
          throw error;
        }),
      ),
    );
    return data.results;
  }

  public async siretBelongToCommune(
    siretCommune: string,
    codeCommune: string,
  ): Promise<boolean> {
    try {
      const mairies = await this.getMairies(codeCommune);
      return mairies.some(({ siret }) => siret === siretCommune);
    } catch (error) {
      this.logger.error(
        `Une erreur s’est produite lors de la récupération du siret de la mairie (Code commune: ${codeCommune}).`,
        ApiAnnuaireService.name,
        error,
      );
      return false;
    }
  }

  public async getEmailsCommune(codeCommune: string): Promise<string[]> {
    try {
      const res = await this.getMairies(codeCommune);

      const mairies = res.filter(
        ({ adresse_courriel }) => adresse_courriel && adresse_courriel !== '',
      );

      if (mairies.length <= 0) {
        throw new Error('L’adresse email n’est pas trouvé');
      }

      const emails: string[] = [
        ...new Set<string>(
          mairies
            .reduce(
              (accumulator, { adresse_courriel }) => [
                ...accumulator,
                ...adresse_courriel.split(';'),
              ],
              [],
            )
            .filter((email) => this.validateEmail(email)),
        ),
      ];

      if (emails.length > 0) {
        return emails;
      }

      throw new Error(
        `Les adresses emails " ${emails.join(',')} " ne peut pas être utilisée`,
      );
    } catch (error) {
      this.logger.error(
        `Une erreur s’est produite lors de la récupération de l’adresse email de la mairie (Code commune: ${codeCommune}).`,
        ApiAnnuaireService.name,
        error,
      );
      return [];
    }
  }
}
