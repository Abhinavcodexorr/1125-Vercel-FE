import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { SubAdmin } from '../../core/models/auth.model';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PaginationBarComponent } from '../../shared/components/pagination-bar/pagination-bar.component';

@Component({
  selector: 'app-subadmins',
  standalone: true,
  imports: [PageHeaderComponent, EmptyStateComponent, PaginationBarComponent, ReactiveFormsModule],
  template: `
    <app-page-header title="Sub-admins" subtitle="Manage admin users with limited access." />

    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }
    @if (notice()) {
      <div class="alert alert-success">{{ notice() }}</div>
    }

    <div class="layout">
      <section class="card panel">
        <h2>Create sub-admin</h2>
        <form [formGroup]="form" (ngSubmit)="create()">
          <div class="form-group">
            <label>Name</label>
            <input formControlName="name" placeholder="Admin name" />
          </div>
          <div class="form-group">
            <label>Email *</label>
            <input type="email" formControlName="email" placeholder="admin@example.com" />
          </div>
          <div class="form-group">
            <label>Password *</label>
            <input type="password" formControlName="password" placeholder="Minimum 6 characters" />
          </div>
          <button type="submit" class="btn btn-primary" [disabled]="form.invalid || saving()">
            {{ saving() ? 'Creating…' : 'Create sub-admin' }}
          </button>
        </form>
      </section>

      <section class="card panel list-panel">
        <div class="panel-head">
          <h2>Sub-admin list</h2>
          <button type="button" class="btn btn-secondary btn-sm" (click)="load()" [disabled]="loading()">
            {{ loading() ? 'Loading…' : 'Refresh' }}
          </button>
        </div>

        @if (loading() && subadmins().length === 0) {
          <app-empty-state icon="👤" title="Loading…" message="Fetching sub-admins." />
        } @else if (subadmins().length === 0) {
          <app-empty-state icon="👤" title="No sub-admins" message="Create a sub-admin to delegate access." />
        } @else {
          <div class="list-shell">
            <div class="table-wrap list-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (admin of paginatedSubadmins(); track admin.id) {
                    <tr>
                      <td>{{ admin.name }}</td>
                      <td>{{ admin.email }}</td>
                      <td>
                        <span class="badge-status" [class]="admin.isBlocked ? 'badge-inactive' : 'badge-active'">
                          {{ admin.isBlocked ? 'Blocked' : 'Active' }}
                        </span>
                      </td>
                      <td class="actions-cell">
                        @if (admin.isBlocked) {
                          <button
                            type="button"
                            class="btn btn-secondary btn-sm"
                            [disabled]="actionId() === admin.id"
                            (click)="unblock(admin)"
                          >
                            Unblock
                          </button>
                        } @else {
                          <button
                            type="button"
                            class="btn btn-ghost btn-sm"
                            [disabled]="actionId() === admin.id"
                            (click)="block(admin)"
                          >
                            Block
                          </button>
                        }
                        <button
                          type="button"
                          class="btn btn-danger btn-sm"
                          [disabled]="actionId() === admin.id"
                          (click)="remove(admin)"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <app-pagination-bar
              [page]="page()"
              [totalPages]="totalPages()"
              [total]="subadmins().length"
              [disabled]="loading()"
              (previous)="prevPage()"
              (next)="nextPage()"
            />
          </div>
        }
      </section>
    </div>
  `,
  styles: `
    .layout {
      display: grid;
      grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
      gap: 1.25rem;
      align-items: start;
    }

    .panel {
      padding: 1.25rem;
    }

    h2 {
      margin: 0 0 1rem;
      font-size: 1rem;
      font-weight: 600;
    }

    .panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .list-panel {
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .list-shell {
      flex: 1;
      min-height: 0;
    }

    @media (max-width: 900px) {
      .layout {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
      .panel-head {
        flex-direction: column;
        align-items: stretch;
      }

      .panel-head .btn {
        width: 100%;
      }
    }
  `,
})
export class SubadminsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly confirmService = inject(ConfirmService);

  protected readonly subadmins = signal<SubAdmin[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly actionId = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly page = signal(1);
  protected readonly pageSize = 10;

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.subadmins().length / this.pageSize)),
  );

  protected readonly paginatedSubadmins = computed(() => {
    const currentPage = Math.min(this.page(), this.totalPages());
    const start = (currentPage - 1) * this.pageSize;
    return this.subadmins().slice(start, start + this.pageSize);
  });

  protected readonly form = this.fb.nonNullable.group({
    name: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.auth.listSubAdmins().subscribe({
      next: (items) => {
        this.subadmins.set(items);
        this.page.set(1);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }

  protected prevPage(): void {
    if (this.page() <= 1) return;
    this.page.update((p) => p - 1);
  }

  protected nextPage(): void {
    if (this.page() >= this.totalPages()) return;
    this.page.update((p) => p + 1);
  }

  protected create(): void {
    if (this.form.invalid) return;

    this.saving.set(true);
    this.error.set(null);
    this.notice.set(null);

    const raw = this.form.getRawValue();
    this.auth
      .createSubAdmin({
        email: raw.email.trim(),
        password: raw.password,
        name: raw.name.trim() || raw.email.split('@')[0],
      })
      .subscribe({
        next: (admin) => {
          this.subadmins.update((list) => [...list, admin]);
          this.form.reset({ name: '', email: '', password: '' });
          this.saving.set(false);
          this.notice.set('Sub-admin created successfully.');
        },
        error: (err: Error) => {
          this.error.set(err.message);
          this.saving.set(false);
        },
      });
  }

  protected block(admin: SubAdmin): void {
    this.actionId.set(admin.id);
    this.auth.blockSubAdmin(admin.id).subscribe({
      next: (updated) => {
        this.patchAdmin(updated);
        this.actionId.set(null);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.actionId.set(null);
      },
    });
  }

  protected unblock(admin: SubAdmin): void {
    this.actionId.set(admin.id);
    this.auth.unblockSubAdmin(admin.id).subscribe({
      next: (updated) => {
        this.patchAdmin(updated);
        this.actionId.set(null);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.actionId.set(null);
      },
    });
  }

  protected async remove(admin: SubAdmin): Promise<void> {
    const ok = await this.confirmService.confirm({
      title: 'Delete sub-admin',
      message: `Delete sub-admin ${admin.email}? This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;

    this.actionId.set(admin.id);
    this.auth.deleteSubAdmin(admin.id).subscribe({
      next: () => {
        this.subadmins.update((list) => list.filter((item) => item.id !== admin.id));
        this.actionId.set(null);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.actionId.set(null);
      },
    });
  }

  private patchAdmin(admin: SubAdmin): void {
    this.subadmins.update((list) => list.map((item) => (item.id === admin.id ? admin : item)));
  }
}
