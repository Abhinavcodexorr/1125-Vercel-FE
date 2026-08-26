import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { SubAdmin } from '../../core/models/auth.model';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PaginationBarComponent } from '../../shared/components/pagination-bar/pagination-bar.component';
import { ShimmerListComponent } from '../../shared/components/shimmer-list/shimmer-list.component';

@Component({
  selector: 'app-subadmins',
  standalone: true,
  imports: [PageHeaderComponent, EmptyStateComponent, PaginationBarComponent, RouterLink, ShimmerListComponent],
  template: `
    <app-page-header title="Users" subtitle="Manage staff accounts with limited access.">
      <a routerLink="/subadmins/new" class="btn btn-primary">+ Add user</a>
    </app-page-header>

    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }

    @if (loading() && subadmins().length === 0) {
      <app-shimmer-list [rows]="8" [columns]="7" />
    } @else if (subadmins().length === 0) {
      <app-empty-state icon="👤" title="No users" message="Add a user to delegate access.">
        <a routerLink="/subadmins/new" class="btn btn-primary">Add user</a>
      </app-empty-state>
    } @else {
      <div class="list-shell">
        <div class="listing-card">
          <div class="table-wrap list-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last login</th>
                  <th>Created date</th>
                  <th class="col-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (admin of paginatedSubadmins(); track admin.id) {
                  <tr>
                    <td>
                      <div class="name-cell">
                        <span class="avatar" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="8" r="3.25" stroke="currentColor" stroke-width="1.75" />
                            <path
                              d="M5.5 18.5c1.4-2.8 3.7-4.2 6.5-4.2s5.1 1.4 6.5 4.2"
                              stroke="currentColor"
                              stroke-width="1.75"
                              stroke-linecap="round"
                            />
                          </svg>
                        </span>
                        <strong>{{ admin.name }}</strong>
                      </div>
                    </td>
                    <td>
                      <div class="meta-cell">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <rect x="3.5" y="5.5" width="17" height="13" rx="2" stroke="currentColor" stroke-width="1.75" />
                          <path d="m4 7 8 6 8-6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
                        </svg>
                        {{ admin.email }}
                      </div>
                    </td>
                    <td>
                      <span class="pill" [class.is-manager]="isManager(admin)">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <circle cx="12" cy="8" r="3" stroke="currentColor" stroke-width="1.75" />
                          <path
                            d="M5.5 18.25c1.35-2.6 3.55-3.9 6.5-3.9s5.15 1.3 6.5 3.9"
                            stroke="currentColor"
                            stroke-width="1.75"
                            stroke-linecap="round"
                          />
                        </svg>
                        {{ roleLabel(admin) }}
                      </span>
                    </td>
                    <td>
                      <span
                        class="pill"
                        [class.is-blocked]="admin.isBlocked"
                        [class.is-inactive]="!admin.isBlocked && admin.isActive === false"
                      >
                        @if (admin.isBlocked) {
                          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.75" />
                            <path d="M8 8l8 8" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
                          </svg>
                          Blocked
                        } @else if (admin.isActive === false) {
                          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.75" />
                            <path d="M8 12h8" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
                          </svg>
                          Inactive
                        } @else {
                          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.75" />
                            <path d="m8.5 12.2 2.4 2.4 4.6-5.2" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
                          </svg>
                          Active
                        }
                      </span>
                    </td>
                    <td>
                      <div class="meta-cell">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.75" />
                          <path d="M12 8v4.5l3 1.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
                        </svg>
                        {{ lastLoginLabel(admin) }}
                      </div>
                    </td>
                    <td>
                      <div class="meta-cell">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" stroke-width="1.75" />
                          <path d="M8 3.5v4M16 3.5v4M4 9.5h16" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
                        </svg>
                        {{ localDateTime(admin.createdAt) }}
                      </div>
                    </td>
                    <td class="actions-cell">
                      <div class="icon-actions">
                        <a
                          class="icon-btn edit"
                          [routerLink]="['/subadmins', admin.id, 'edit']"
                          title="Update"
                          aria-label="Update {{ admin.name }}"
                        >
                          <svg viewBox="0 0 24 24" fill="none">
                            <path
                              d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"
                              stroke="currentColor"
                              stroke-width="1.75"
                              stroke-linejoin="round"
                            />
                            <path d="m13.5 6.5 3 3" stroke="currentColor" stroke-width="1.75" />
                          </svg>
                        </a>
                        @if (admin.isBlocked) {
                          <button
                            type="button"
                            class="icon-btn unblock"
                            [disabled]="actionId() === admin.id"
                            title="Unblock"
                            aria-label="Unblock {{ admin.name }}"
                            (click)="unblock(admin)"
                          >
                            <svg viewBox="0 0 24 24" fill="none">
                              <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" stroke-width="1.75" />
                              <path d="M8 11V8a4 4 0 0 1 7.5-2" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
                            </svg>
                          </button>
                        } @else {
                          <button
                            type="button"
                            class="icon-btn block"
                            [disabled]="actionId() === admin.id"
                            title="Block"
                            aria-label="Block {{ admin.name }}"
                            (click)="block(admin)"
                          >
                            <svg viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.75" />
                              <path d="M7.2 7.2l9.6 9.6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
                            </svg>
                          </button>
                        }
                        <button
                          type="button"
                          class="icon-btn delete"
                          [disabled]="actionId() === admin.id"
                          title="Delete"
                          aria-label="Delete {{ admin.name }}"
                          (click)="remove(admin)"
                        >
                          <svg viewBox="0 0 24 24" fill="none">
                            <path d="M5 7h14" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
                            <path d="M10 7V5h4v2" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
                            <path d="M8 7l.8 12h6.4L16 7" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" />
                          </svg>
                        </button>
                      </div>
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
            [showSinglePage]="true"
            (previous)="prevPage()"
            (next)="nextPage()"
            (goTo)="goToPage($event)"
          />
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }

    .list-shell {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }

    .listing-card {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      background: var(--white);
      border: 1px solid var(--border-light);
      border-radius: var(--radius);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }

    .table-wrap {
      flex: 1;
      min-height: 0;
      max-height: none;
      border: none;
      border-radius: 0;
      box-shadow: none;
    }

    table {
      width: 100%;
      min-width: 64rem;
      border-collapse: separate;
      border-spacing: 0;
    }

    th,
    td {
      padding: 0.85rem 1rem;
      vertical-align: middle;
      text-align: left;
      white-space: nowrap;
    }

    th {
      position: sticky;
      top: 0;
      z-index: 2;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #111111;
      background: var(--white);
      border-bottom: 1px solid var(--border);
    }

    td {
      font-size: 0.875rem;
      color: var(--text);
      border-bottom: 1px solid var(--border-light);
    }

    tbody tr:nth-child(even) td {
      background: #f7f9fb;
    }

    tbody tr:hover td {
      background: #eef4f8;
    }

    .col-center,
    .actions-cell {
      text-align: center;
    }

    .name-cell,
    .meta-cell,
    .icon-actions {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
    }

    .avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border-radius: 999px;
      background: #1a2b3c;
      color: var(--white);
      flex-shrink: 0;
    }

    .avatar svg,
    .meta-cell svg,
    .pill svg,
    .icon-btn svg {
      width: 1rem;
      height: 1rem;
    }

    .meta-cell {
      color: var(--text-secondary);
    }

    .meta-cell svg {
      color: var(--text-muted);
      flex-shrink: 0;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.28rem 0.7rem;
      border-radius: 999px;
      background: #e6f4ed;
      color: var(--success);
      font-size: 0.75rem;
      font-weight: 700;
    }

    .pill.is-manager {
      background: #fef6e6;
      color: var(--warning);
    }

    .pill.is-blocked {
      background: #fdeaea;
      color: var(--danger);
    }

    .pill.is-inactive {
      background: #eef2f6;
      color: var(--text-secondary);
    }

    .icon-actions {
      justify-content: center;
      gap: 0.4rem;
    }

    .icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.05rem;
      height: 2.05rem;
      border-radius: 0.55rem;
      border: 1px solid transparent;
      background: var(--white);
      cursor: pointer;
      text-decoration: none;
    }

    .icon-btn.edit {
      color: var(--primary-dark);
      border-color: #c5d9eb;
      background: #f4f8fb;
    }

    .icon-btn.block {
      color: var(--warning);
      background: #fef6e6;
    }

    .icon-btn.unblock {
      color: var(--success);
      background: #e6f4ed;
    }

    .icon-btn.delete {
      color: var(--danger);
      background: #fdeaea;
    }

    .icon-btn:hover:not(:disabled) {
      filter: brightness(0.96);
    }

    .icon-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
})
export class SubadminsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly confirmService = inject(ConfirmService);

  protected readonly subadmins = signal<SubAdmin[]>([]);
  protected readonly loading = signal(false);
  protected readonly actionId = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
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

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.auth.listSubAdmins().subscribe({
      next: (items) => {
        this.subadmins.set(items);
        this.page.set(Math.min(this.page(), Math.max(1, Math.ceil(items.length / this.pageSize) || 1)));
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

  protected goToPage(page: number): void {
    this.page.set(Math.min(this.totalPages(), Math.max(1, page)));
  }

  protected roleLabel(admin: SubAdmin): string {
    return admin.role === 'Manager' ? 'Manager' : 'SubAdmin';
  }

  protected isManager(admin: SubAdmin): boolean {
    return admin.role === 'Manager';
  }

  protected lastLoginLabel(admin: SubAdmin): string {
    if (!admin.hasLoggedIn || !admin.lastLogin) return 'Never';
    const label = this.localDateTime(admin.lastLogin);
    return admin.hasActiveSession && label !== '-' ? `${label} · Online` : label;
  }

  protected localDateTime(value?: string): string {
    if (!value) return '-';
    const raw = value.trim();
    const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(raw);
    const date = new Date(
      hasZone ? raw : raw.includes('T') || raw.includes(' ') ? `${raw.replace(' ', 'T')}Z` : `${raw}T00:00:00Z`,
    );
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  }

  protected async block(admin: SubAdmin): Promise<void> {
    const ok = await this.confirmService.confirm({
      title: 'ARE YOU SURE YOU WANT TO BLOCK THIS USER?',
      message: '',
      confirmLabel: 'Yes',
      cancelLabel: 'No',
      variant: 'danger',
    });
    if (!ok) return;

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

  protected async unblock(admin: SubAdmin): Promise<void> {
    const ok = await this.confirmService.confirm({
      title: 'ARE YOU SURE YOU WANT TO UNBLOCK THIS USER?',
      message: '',
      confirmLabel: 'Yes',
      cancelLabel: 'No',
    });
    if (!ok) return;

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
      title: 'ARE YOU SURE YOU WANT TO DELETE THIS USER?',
      message: '',
      confirmLabel: 'Yes',
      cancelLabel: 'No',
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
    this.subadmins.update((list) => list.map((item) => (item.id === admin.id ? { ...item, ...admin } : item)));
  }
}
