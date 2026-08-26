import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const next = group.get('newPassword')?.value ?? '';
  const confirm = group.get('confirmPassword')?.value ?? '';
  if (!next || !confirm) return null;
  return next === confirm ? null : { mismatch: true };
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [PageHeaderComponent, ReactiveFormsModule],
  template: `
    <app-page-header title="Settings" subtitle="Update your account password." />

    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }

    <div class="form-card card">
      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="fields">
          <div class="form-group">
            <label>Current password *</label>
            <div class="password-wrap">
              <input
                [type]="showOld() ? 'text' : 'password'"
                formControlName="currentPassword"
                placeholder="Enter current password"
                autocomplete="current-password"
              />
              <button type="button" class="eye-btn" (click)="showOld.set(!showOld())" [attr.aria-label]="showOld() ? 'Hide password' : 'Show password'">
                @if (showOld()) {
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M3 3l18 18M10.5 10.7a3 3 0 0 0 4.2 4.2M9.9 5.6A10.8 10.8 0 0 1 12 5.4c5.2 0 9.2 3.6 10.5 6.6-.5 1.1-1.4 2.4-2.7 3.6M6.1 6.3C4.2 7.6 2.8 9.4 1.5 12c1.3 2.6 4.7 6.6 10.5 6.6 1.3 0 2.5-.2 3.6-.6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
                  </svg>
                } @else {
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M2 12s3.6-6.6 10-6.6S22 12 22 12s-3.6 6.6-10 6.6S2 12 2 12Z" stroke="currentColor" stroke-width="1.75" />
                    <circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.75" />
                  </svg>
                }
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>New password *</label>
            <div class="password-wrap">
              <input
                [type]="showNew() ? 'text' : 'password'"
                formControlName="newPassword"
                placeholder="Minimum 8 characters"
                autocomplete="new-password"
              />
              <button type="button" class="eye-btn" (click)="showNew.set(!showNew())" [attr.aria-label]="showNew() ? 'Hide password' : 'Show password'">
                @if (showNew()) {
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M3 3l18 18M10.5 10.7a3 3 0 0 0 4.2 4.2M9.9 5.6A10.8 10.8 0 0 1 12 5.4c5.2 0 9.2 3.6 10.5 6.6-.5 1.1-1.4 2.4-2.7 3.6M6.1 6.3C4.2 7.6 2.8 9.4 1.5 12c1.3 2.6 4.7 6.6 10.5 6.6 1.3 0 2.5-.2 3.6-.6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
                  </svg>
                } @else {
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M2 12s3.6-6.6 10-6.6S22 12 22 12s-3.6 6.6-10 6.6S2 12 2 12Z" stroke="currentColor" stroke-width="1.75" />
                    <circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.75" />
                  </svg>
                }
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>Confirm new password *</label>
            <div class="password-wrap">
              <input
                [type]="showConfirm() ? 'text' : 'password'"
                formControlName="confirmPassword"
                placeholder="Re-enter new password"
                autocomplete="new-password"
              />
              <button type="button" class="eye-btn" (click)="showConfirm.set(!showConfirm())" [attr.aria-label]="showConfirm() ? 'Hide password' : 'Show password'">
                @if (showConfirm()) {
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M3 3l18 18M10.5 10.7a3 3 0 0 0 4.2 4.2M9.9 5.6A10.8 10.8 0 0 1 12 5.4c5.2 0 9.2 3.6 10.5 6.6-.5 1.1-1.4 2.4-2.7 3.6M6.1 6.3C4.2 7.6 2.8 9.4 1.5 12c1.3 2.6 4.7 6.6 10.5 6.6 1.3 0 2.5-.2 3.6-.6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
                  </svg>
                } @else {
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M2 12s3.6-6.6 10-6.6S22 12 22 12s-3.6 6.6-10 6.6S2 12 2 12Z" stroke="currentColor" stroke-width="1.75" />
                    <circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.75" />
                  </svg>
                }
              </button>
            </div>
            @if (form.hasError('mismatch') && form.controls.confirmPassword.touched) {
              <p class="field-hint error">New password and confirm password must match.</p>
            }
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary" [disabled]="form.invalid || saving()">
            {{ saving() ? 'Updating…' : 'Update password' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      width: 100%;
    }

    .form-card {
      width: 100%;
      flex: 1;
      min-height: 0;
      padding: 1.75rem 2rem;
      display: flex;
      flex-direction: column;
    }

    form {
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.1rem 1.5rem;
      align-content: start;
    }

    .password-wrap {
      position: relative;
    }

    .password-wrap input {
      padding-right: 2.75rem;
    }

    .eye-btn {
      position: absolute;
      top: 50%;
      right: 0.55rem;
      transform: translateY(-50%);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border: none;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      padding: 0;
    }

    .eye-btn svg {
      width: 1.15rem;
      height: 1.15rem;
    }

    .eye-btn:hover {
      color: var(--primary-dark);
    }

    .field-hint {
      margin: 0.4rem 0 0;
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    .field-hint.error {
      color: var(--danger);
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: auto;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border-light);
    }

    @media (max-width: 720px) {
      .form-card {
        padding: 1.15rem;
      }

      .fields {
        grid-template-columns: 1fr;
      }

      .form-actions .btn {
        width: 100%;
      }
    }
  `,
})
export class SettingsComponent {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showOld = signal(false);
  protected readonly showNew = signal(false);
  protected readonly showConfirm = signal(false);

  protected readonly form = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const { currentPassword, newPassword } = this.form.getRawValue();
    this.auth.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => this.auth.requireLoginAfterPasswordChange(),
      error: (err: Error) => {
        this.saving.set(false);
        this.error.set(err.message);
      },
    });
  }
}
