import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-subadmin-form',
  standalone: true,
  imports: [PageHeaderComponent, ReactiveFormsModule, RouterLink],
  template: `
    <app-page-header
      [title]="isEdit() ? 'Update user' : 'Add user'"
      [subtitle]="isEdit() ? 'Change user details, role, or password.' : 'Create a staff account with limited access.'"
    />

    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }

    @if (loading()) {
      <div class="form-card card"><p>Loading…</p></div>
    } @else {
      <div class="form-card card">
        <form [formGroup]="form" (ngSubmit)="save()">
          <div class="fields-grid">
            <div class="form-group">
              <label>First name</label>
              <input formControlName="firstName" placeholder="First name" />
            </div>
            <div class="form-group">
              <label>Last name</label>
              <input formControlName="lastName" placeholder="Last name" />
            </div>
            <div class="form-group">
              <label>Email *</label>
              <input type="email" formControlName="email" placeholder="admin@example.com" />
            </div>
            <div class="form-group">
              <label>Role *</label>
              <select formControlName="role">
                <option value="SubAdmin">SubAdmin</option>
                <option value="Manager">Manager</option>
              </select>
            </div>
            <div class="form-group">
              <label>{{ isEdit() ? 'Password' : 'Password *' }}</label>
              <div class="password-wrap">
                <input
                  [type]="showPassword() ? 'text' : 'password'"
                  formControlName="password"
                  [placeholder]="isEdit() ? 'Leave blank to keep current password' : 'Minimum 6 characters'"
                  autocomplete="new-password"
                />
                <button
                  type="button"
                  class="eye-btn"
                  (click)="showPassword.set(!showPassword())"
                  [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
                >
                  @if (showPassword()) {
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M3 3l18 18M10.5 10.7a3 3 0 0 0 4.2 4.2M9.9 5.6A10.8 10.8 0 0 1 12 5.4c5.2 0 9.2 3.6 10.5 6.6-.5 1.1-1.4 2.4-2.7 3.6M6.1 6.3C4.2 7.6 2.8 9.4 1.5 12c1.3 2.6 4.7 6.6 10.5 6.6 1.3 0 2.5-.2 3.6-.6"
                        stroke="currentColor"
                        stroke-width="1.75"
                        stroke-linecap="round"
                      />
                    </svg>
                  } @else {
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M2 12s3.6-6.6 10-6.6S22 12 22 12s-3.6 6.6-10 6.6S2 12 2 12Z"
                        stroke="currentColor"
                        stroke-width="1.75"
                      />
                      <circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.75" />
                    </svg>
                  }
                </button>
              </div>
              @if (isEdit()) {
                <p class="field-hint">If you don’t want to update the password, leave it blank.</p>
              }
            </div>
          </div>

          <div class="form-actions">
            <a routerLink="/subadmins" class="btn btn-ghost">Cancel</a>
            <button type="submit" class="btn btn-primary" [disabled]="form.invalid || saving()">
              {{ saving() ? (isEdit() ? 'Updating…' : 'Creating…') : isEdit() ? 'Update user' : 'Add user' }}
            </button>
          </div>
        </form>
      </div>
    }
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
      max-width: none;
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
      min-height: 0;
    }

    .fields-grid {
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
      line-height: 1.4;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: 0.625rem;
      margin-top: auto;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border-light);
    }

    @media (max-width: 720px) {
      .form-card {
        padding: 1.15rem;
      }

      .fields-grid {
        grid-template-columns: 1fr;
      }

      .form-actions {
        flex-direction: column-reverse;
        align-items: stretch;
      }

      .form-actions .btn,
      .form-actions a.btn {
        width: 100%;
      }
    }
  `,
})
export class SubadminFormComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly isEdit = signal(false);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  private staffId = '';

  protected readonly form = this.fb.nonNullable.group({
    firstName: [''],
    lastName: [''],
    email: ['', [Validators.required, Validators.email]],
    role: ['SubAdmin' as 'SubAdmin' | 'Manager'],
    password: [''],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.form.controls.password.addValidators([Validators.required, Validators.minLength(6)]);
      this.form.controls.password.updateValueAndValidity();
      return;
    }

    this.isEdit.set(true);
    this.staffId = id;
    this.form.controls.password.addValidators([Validators.minLength(8)]);
    this.form.controls.password.updateValueAndValidity();
    this.loading.set(true);

    this.auth.getSubAdmin(id).subscribe({
      next: (admin) => {
        this.form.patchValue({
          firstName: admin.firstName ?? '',
          lastName: admin.lastName ?? '',
          email: admin.email,
          role: admin.role === 'Manager' ? 'Manager' : 'SubAdmin',
          password: '',
        });
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
        this.router.navigate(['/subadmins']);
      },
    });
  }

  protected save(): void {
    if (this.form.invalid) return;

    this.saving.set(true);
    this.error.set(null);
    const raw = this.form.getRawValue();
    const password = raw.password.trim();

    if (this.isEdit()) {
      this.auth
        .updateSubAdmin(this.staffId, {
          firstName: raw.firstName.trim(),
          lastName: raw.lastName.trim(),
          email: raw.email.trim(),
          role: raw.role,
          ...(password ? { password } : {}),
        })
        .subscribe({
          next: () => this.router.navigate(['/subadmins']),
          error: (err: Error) => {
            this.error.set(err.message);
            this.saving.set(false);
          },
        });
      return;
    }

    this.auth
      .createSubAdmin({
        firstName: raw.firstName.trim(),
        lastName: raw.lastName.trim(),
        email: raw.email.trim(),
        password,
        role: raw.role,
      })
      .subscribe({
        next: () => this.router.navigate(['/subadmins']),
        error: (err: Error) => {
          this.error.set(err.message);
          this.saving.set(false);
        },
      });
  }
}
