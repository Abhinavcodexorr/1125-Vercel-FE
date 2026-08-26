import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import {
  AdminUser,
  ChangePasswordPayload,
  ForgotPasswordPayload,
  LoginPayload,
  LoginResponseBody,
  SubAdmin,
  SubAdminCreatePayload,
  SubAdminUpdatePayload,
  extractToken,
  extractUser,
  mapAdminUser,
} from '../models/auth.model';
import { unwrapApiItem, unwrapApiList } from '../models/room.model';
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
  readonly isSuperAdmin = computed(() => this.userSignal()?.role === 'SuperAdmin');

  private readonly authBase = `${environment.apiBaseUrl}/superadmin`;

  login(payload: LoginPayload): Observable<AdminUser> {
    return this.http
      .post<LoginResponseBody>(`${this.authBase}/login`, payload, {
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
        catchError((err) => throwError(() => new Error(this.readErrorMessage(err)))),
      );
  }

  forgotPassword(payload: ForgotPasswordPayload): Observable<string> {
    return this.http.post<{ message?: string }>(`${this.authBase}/forgot-password`, payload).pipe(
      map((body) => body.message ?? 'Password reset email sent.'),
      catchError((err) => throwError(() => new Error(this.readErrorMessage(err)))),
    );
  }

  logout(redirect = true): void {
    const token = this.tokenSignal();
    this.clearSession();

    if (token) {
      this.http
        .post(`${this.authBase}/logout`, {}, { headers: this.buildAuthHeaders() })
        .subscribe({ error: () => undefined });
    }

    if (redirect) {
      void this.router.navigate(['/login']);
    }
  }

  getMe(): Observable<AdminUser> {
    return this.http
      .get<unknown>(`${this.authBase}/me`, { headers: this.buildAuthHeaders() })
      .pipe(
        map((body) => mapAdminUser(unwrapApiItem<AdminUser>(body))),
        tap((user) => this.updateUser(user)),
        catchError((err) => throwError(() => new Error(this.readErrorMessage(err)))),
      );
  }

  changePassword(payload: ChangePasswordPayload): Observable<string> {
    return this.http
      .put<{ message?: string }>(`${this.authBase}/password`, payload, {
        headers: this.buildAuthHeaders(),
      })
      .pipe(
        map((body) => body.message ?? 'Password updated successfully. Please sign in again.'),
        catchError((err) => throwError(() => new Error(this.readErrorMessage(err)))),
      );
  }

  /** Server invalidates the token on password change — clear local session and send user to login. */
  requireLoginAfterPasswordChange(): void {
    this.clearSession();
    void this.router.navigate(['/login'], {
      queryParams: { reason: 'password-updated' },
    });
  }

  createSubAdmin(payload: SubAdminCreatePayload): Observable<SubAdmin> {
    return this.http
      .post<unknown>(`${this.authBase}/subadmin`, payload, { headers: this.buildAuthHeaders() })
      .pipe(
        map((body) => mapAdminUser(unwrapApiItem<SubAdmin>(body)) as SubAdmin),
        catchError((err) => throwError(() => new Error(this.readErrorMessage(err)))),
      );
  }

  listSubAdmins(): Observable<SubAdmin[]> {
    return this.http
      .get<unknown>(`${this.authBase}/subadmin`, { headers: this.buildAuthHeaders() })
      .pipe(
        map((body) => unwrapApiList<SubAdmin>(body).map((item) => mapAdminUser(item) as SubAdmin)),
        catchError((err) => throwError(() => new Error(this.readErrorMessage(err)))),
      );
  }

  getSubAdmin(id: string): Observable<SubAdmin> {
    return this.http
      .get<unknown>(`${this.authBase}/subadmin/${encodeURIComponent(id)}`, {
        headers: this.buildAuthHeaders(),
      })
      .pipe(
        map((body) => mapAdminUser(unwrapApiItem<SubAdmin>(body)) as SubAdmin),
        catchError((err) => throwError(() => new Error(this.readErrorMessage(err)))),
      );
  }

  updateSubAdmin(id: string, payload: SubAdminUpdatePayload): Observable<SubAdmin> {
    return this.http
      .put<unknown>(`${this.authBase}/subadmin/${encodeURIComponent(id)}`, payload, {
        headers: this.buildAuthHeaders(),
      })
      .pipe(
        map((body) => mapAdminUser(unwrapApiItem<SubAdmin>(body)) as SubAdmin),
        catchError((err) => throwError(() => new Error(this.readErrorMessage(err)))),
      );
  }

  blockSubAdmin(id: string): Observable<SubAdmin> {
    return this.http
      .put<unknown>(`${this.authBase}/subadmin/${encodeURIComponent(id)}/block`, {}, {
        headers: this.buildAuthHeaders(),
      })
      .pipe(
        map((body) => mapAdminUser(unwrapApiItem<SubAdmin>(body)) as SubAdmin),
        catchError((err) => throwError(() => new Error(this.readErrorMessage(err)))),
      );
  }

  unblockSubAdmin(id: string): Observable<SubAdmin> {
    return this.http
      .put<unknown>(`${this.authBase}/subadmin/${encodeURIComponent(id)}/unblock`, {}, {
        headers: this.buildAuthHeaders(),
      })
      .pipe(
        map((body) => mapAdminUser(unwrapApiItem<SubAdmin>(body)) as SubAdmin),
        catchError((err) => throwError(() => new Error(this.readErrorMessage(err)))),
      );
  }

  deleteSubAdmin(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.authBase}/subadmin/${encodeURIComponent(id)}`, {
        headers: this.buildAuthHeaders(),
      })
      .pipe(catchError((err) => throwError(() => new Error(this.readErrorMessage(err)))));
  }

  refreshSession(): void {
    if (!this.isAuthenticated()) return;
    this.getMe().subscribe({ error: () => undefined });
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

  private buildAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-access-token': token,
      Authorization: `Bearer ${token}`,
    });
  }

  private updateUser(user: AdminUser): void {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    this.userSignal.set(user);
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

  private readErrorMessage(err: unknown): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const apiErr = (err as { error?: { message?: string } }).error;
      if (apiErr?.message) return apiErr.message;
    }
    if (err instanceof Error) return err.message;
    return 'Request failed';
  }
}
