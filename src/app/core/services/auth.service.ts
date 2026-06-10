import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, map, throwError } from 'rxjs';
import {
  AdminUser,
  LoginPayload,
  LoginResponseBody,
  extractToken,
  extractUser,
} from '../models/auth.model';
import { environment } from '../../../environments/environment';

const TOKEN_STORAGE_KEY = 'access_token';
const USER_STORAGE_KEY = 'admin_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly tokenSignal = signal(this.readToken());
  private readonly userSignal = signal<AdminUser | null>(this.readUser());

  readonly token = this.tokenSignal.asReadonly();
  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.tokenSignal());

  login(payload: LoginPayload): Observable<AdminUser> {
    return this.http
      .post<LoginResponseBody>(`${environment.apiBaseUrl}${environment.authLoginPath}`, payload, {
        observe: 'response',
      })
      .pipe(
        map((response) => {
          const headerToken = response.headers.get('x-access-token');
          const bodyToken = extractToken(response.body ?? {});
          const token = headerToken || bodyToken;

          if (!token) {
            throw new Error('Login succeeded but no access token was returned.');
          }

          const user = extractUser(response.body ?? {}, payload.email);
          this.persistSession(token, user);
          return user;
        }),
        catchError((err) => {
          const message =
            err?.error?.message ??
            err?.message ??
            'Invalid email or password. Please try again.';
          return throwError(() => new Error(message));
        }),
      );
  }

  logout(redirect = true): void {
    this.clearSession();
    if (redirect) {
      void this.router.navigate(['/login']);
    }
  }

  getToken(): string {
    return this.tokenSignal() || environment.accessToken;
  }

  getUserInitials(): string {
    const user = this.userSignal();
    if (!user) return 'AD';

    const raw = (user.name || user.email.split('@')[0] || '').trim();
    const name = raw.replace(/^[\d._-]+/, '') || raw;
    const parts = name.split(/\s+/).filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    const word = parts[0] || 'admin';
    if (word.length >= 2) {
      return word.slice(0, 2).toUpperCase();
    }

    return word[0]?.toUpperCase() ?? 'AD';
  }

  handleUnauthorized(): void {
    this.clearSession();
    void this.router.navigate(['/login'], {
      queryParams: { reason: 'session-expired' },
    });
  }

  private persistSession(token: string, user: AdminUser): void {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    this.tokenSignal.set(token);
    this.userSignal.set(user);
  }

  private clearSession(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    this.tokenSignal.set('');
    this.userSignal.set(null);
  }

  private readToken(): string {
    if (typeof localStorage === 'undefined') return environment.accessToken;
    return localStorage.getItem(TOKEN_STORAGE_KEY) || environment.accessToken;
  }

  private readUser(): AdminUser | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AdminUser;
    } catch {
      return null;
    }
  }
}
