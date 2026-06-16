import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="login-page">
      <section class="brand-panel">
        <div class="brand-content">
          <img src="/logo.svg" alt="1125 Beach Villa" class="brand-logo" />
          <p class="brand-tag">Admin Portal</p>
          <h1>Manage your beach villa with ease</h1>
          <p class="brand-copy">
            Categories, rooms, gallery and bookings — everything for 1125 Beach Villa in one place.
          </p>

          <ul class="brand-points">
            <li>Room management</li>
            <li>Category-first listings</li>
            <li>Secure admin access</li>
          </ul>
        </div>

        <div class="brand-wave" aria-hidden="true"></div>
      </section>

      <section class="form-panel">
        <div class="form-wrap">
          <div class="mobile-brand">
            <img src="/logo-mark.svg" alt="1125" />
            <span>1125 Beach Villa</span>
          </div>

          <div class="login-card">
            <div class="card-head">
              <h2>Welcome back</h2>
              <p>Sign in to continue to the admin dashboard.</p>
            </div>

            @if (sessionNotice()) {
              <div class="alert alert-info">{{ sessionNotice() }}</div>
            }

            @if (error()) {
              <div class="alert alert-error">{{ error() }}</div>
            }

            <form [formGroup]="form" (ngSubmit)="submit()">
              <div class="field">
                <label for="email">Email address</label>
                <div class="input-wrap">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M4 6h16v12H4V6Z"
                      stroke="currentColor"
                      stroke-width="1.75"
                      stroke-linejoin="round"
                    />
                    <path
                      d="m4 7 8 6 8-6"
                      stroke="currentColor"
                      stroke-width="1.75"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  <input
                    id="email"
                    type="email"
                    formControlName="email"
                    placeholder="admin@1125beachvilla.com"
                    autocomplete="email"
                  />
                </div>
              </div>

              <div class="field">
                <label for="password">Password</label>
                <div class="input-wrap">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect
                      x="5"
                      y="11"
                      width="14"
                      height="10"
                      rx="2"
                      stroke="currentColor"
                      stroke-width="1.75"
                    />
                    <path
                      d="M8 11V8a4 4 0 1 1 8 0v3"
                      stroke="currentColor"
                      stroke-width="1.75"
                      stroke-linecap="round"
                    />
                  </svg>
                  <input
                    id="password"
                    [type]="showPassword() ? 'text' : 'password'"
                    formControlName="password"
                    placeholder="Enter your password"
                    autocomplete="current-password"
                  />
                  <button
                    type="button"
                    class="toggle-password"
                    (click)="showPassword.set(!showPassword())"
                    [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
                  >
                    {{ showPassword() ? 'Hide' : 'Show' }}
                  </button>
                </div>
              </div>

              <div class="form-footer">
                <button
                  type="button"
                  class="link-btn"
                  [disabled]="forgotLoading()"
                  (click)="forgotPassword()"
                >
                  {{ forgotLoading() ? 'Sending…' : 'Forgot password?' }}
                </button>
              </div>

              <button type="submit" class="btn btn-primary submit-btn" [disabled]="form.invalid || loading()">
                @if (loading()) {
                  Signing in…
                } @else {
                  Sign in
                }
              </button>
            </form>
          </div>

          <p class="footer-note">1125 Beach Villa · Admin access only</p>
        </div>
      </section>
    </div>
  `,
  styles: `
    .login-page {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 1.05fr 0.95fr;
      background: var(--bg);
    }

    .brand-panel {
      position: relative;
      overflow: hidden;
      background: linear-gradient(
        165deg,
        var(--sidebar-bg-top) 0%,
        var(--sidebar-bg-mid) 48%,
        var(--sidebar-bg-bottom) 100%
      );
      color: var(--white);
      display: flex;
      align-items: center;
      padding: 3rem;
    }

    .brand-content {
      position: relative;
      z-index: 1;
      max-width: 34rem;
      animation: fadeIn 0.55s ease;
    }

    .brand-logo {
      width: min(280px, 72%);
      margin-bottom: 1rem;
      filter: brightness(0) invert(1);
    }

    .brand-tag {
      display: inline-flex;
      margin: 0 0 1.25rem;
      padding: 0.35rem 0.85rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.14);
      font-size: 0.8125rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .brand-content h1 {
      margin: 0 0 0.85rem;
      font-size: clamp(1.75rem, 3vw, 2.35rem);
      line-height: 1.2;
      font-weight: 700;
    }

    .brand-copy {
      margin: 0 0 1.75rem;
      font-size: 1.02rem;
      line-height: 1.65;
      color: rgba(255, 255, 255, 0.88);
    }

    .brand-points {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 0.75rem;
    }

    .brand-points li {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      font-size: 0.95rem;
      color: rgba(255, 255, 255, 0.92);
    }

    .brand-points li::before {
      content: '';
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.85);
      flex-shrink: 0;
    }

    .brand-wave {
      position: absolute;
      inset: auto -10% -18% -10%;
      height: 42%;
      background: radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.18), transparent 68%);
      pointer-events: none;
    }

    .form-panel {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .form-wrap {
      width: min(100%, 420px);
      animation: fadeIn 0.55s ease 0.08s both;
    }

    .mobile-brand {
      display: none;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
      color: var(--primary-dark);
      font-weight: 700;
    }

    .mobile-brand img {
      width: 42px;
      height: 42px;
    }

    .login-card {
      background: var(--white);
      border: 1px solid var(--border-light);
      border-radius: calc(var(--radius) + 2px);
      box-shadow: var(--shadow-md);
      padding: 2rem;
    }

    .card-head h2 {
      margin: 0 0 0.35rem;
      font-size: 1.65rem;
      color: var(--text);
    }

    .card-head p {
      margin: 0 0 1.5rem;
      color: var(--text-secondary);
      font-size: 0.95rem;
    }

    .field {
      margin-bottom: 1.1rem;
    }

    .field label {
      display: block;
      margin-bottom: 0.45rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text);
    }

    .input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-wrap svg {
      position: absolute;
      left: 0.9rem;
      width: 18px;
      height: 18px;
      color: var(--text-muted);
      pointer-events: none;
    }

    .input-wrap input {
      width: 100%;
      padding: 0.78rem 0.9rem 0.78rem 2.65rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--white);
      color: var(--text);
      transition: border-color var(--transition), box-shadow var(--transition);
    }

    .input-wrap input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(124, 165, 200, 0.22);
    }

    .toggle-password {
      position: absolute;
      right: 0.65rem;
      border: none;
      background: transparent;
      color: var(--primary-dark);
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      padding: 0.25rem 0.35rem;
    }

    .form-footer {
      display: flex;
      justify-content: flex-end;
      margin-top: 0.5rem;
    }

    .link-btn {
      border: none;
      background: transparent;
      color: var(--primary-dark);
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      padding: 0;
    }

    .link-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .submit-btn {
      width: 100%;
      margin-top: 0.35rem;
      padding: 0.82rem 1rem;
      font-size: 1rem;
    }

    .submit-btn:disabled {
      opacity: 0.65;
      cursor: not-allowed;
      transform: none;
    }

    .footer-note {
      margin: 1.25rem 0 0;
      text-align: center;
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    @media (max-width: 960px) {
      .login-page {
        grid-template-columns: 1fr;
      }

      .brand-panel {
        display: none;
      }

      .mobile-brand {
        display: flex;
      }

      .form-panel {
        padding: 1.25rem;
      }
    }
  `,
})
export class LoginComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(false);
  protected readonly forgotLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly sessionNotice = signal<string | null>(null);

  private returnUrl = '/dashboard';

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';

    if (this.route.snapshot.queryParamMap.get('reason') === 'session-expired') {
      this.sessionNotice.set('Your session expired. Please sign in again.');
    }
  }

  forgotPassword(): void {
    const email = this.form.controls.email.value.trim();
    if (!email) {
      this.error.set('Enter your email address first, then click Forgot password.');
      return;
    }

    this.forgotLoading.set(true);
    this.error.set(null);
    this.sessionNotice.set(null);

    this.auth.forgotPassword({ email }).subscribe({
      next: (message) => {
        this.forgotLoading.set(false);
        this.sessionNotice.set(message);
      },
      error: (err: Error) => {
        this.forgotLoading.set(false);
        this.error.set(err.message);
      },
    });
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);
    this.sessionNotice.set(null);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigateByUrl(this.returnUrl);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.error.set(err.message);
      },
    });
  }
}
