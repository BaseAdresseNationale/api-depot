import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';

@Injectable()
export class BanService {
  constructor(private readonly httpService: HttpService) {}

  public async composeCommune(codeCommune: string) {
    try {
      const url: string = `communes/${codeCommune}/compose`;
      await firstValueFrom(
        this.httpService.get<any>(url).pipe(
          catchError((error: AxiosError) => {
            throw error;
          }),
        ),
      );
    } catch (error) {
      console.error(error);
    }
  }
}
