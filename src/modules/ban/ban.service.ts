import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';
import { LookupResponse } from './ban.type';

@Injectable()
export class BanService {
  constructor(
    private readonly httpService: HttpService,
    private readonly logger: Logger,
  ) {}

  public async getLookup(codeCommune: string): Promise<LookupResponse> {
    const { data } = await firstValueFrom(
      await this.httpService.get<LookupResponse>(`/lookup/${codeCommune}`).pipe(
        catchError((error: AxiosError) => {
          throw error;
        }),
      ),
    );
    return data;
  }

  public async composeCommune(codeCommune: string) {
    try {
      const url: string = `/ban/communes/${codeCommune}/compose`;
      await firstValueFrom(
        this.httpService.post<any>(url).pipe(
          catchError((error: AxiosError) => {
            throw error;
          }),
        ),
      );
    } catch (error) {
      this.logger.error(
        `Une erreur est survenue lors de l'appel compose a la BAN`,
        BanService.name,
        {
          status: error.response?.status,
          text: error.response?.statusText,
        },
      );
    }
  }
}
