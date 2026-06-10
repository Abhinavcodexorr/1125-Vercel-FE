import { Injectable, inject } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly auth = inject(AuthService);
  readonly baseUrl = environment.apiBaseUrl;

  authHeaders(extra: Record<string, string> = {}): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-access-token': token,
      Authorization: `Bearer ${token}`,
      ...extra,
    });
  }
}
