import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isApiRequest = req.url.startsWith(environment.apiBaseUrl);
  const isPublicAuthRequest =
    req.url.includes('/superadmin/login') || req.url.includes('/superadmin/forgot-password');

  let outgoing = req;
  if (isApiRequest && !isPublicAuthRequest) {
    const token = auth.getToken();
    if (token) {
      outgoing = req.clone({
        setHeaders: {
          'x-access-token': token,
          Authorization: `Bearer ${token}`,
        },
      });
    }
  }

  return next(outgoing).pipe(
    catchError((err) => {
      if (err.status === 401 && isApiRequest && !isPublicAuthRequest) {
        auth.handleUnauthorized();
      }
      return throwError(() => err);
    }),
  );
};
