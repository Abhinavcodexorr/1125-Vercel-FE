import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { SidebarService } from '../../core/services/sidebar.service';

@Component({
  selector: 'app-header',
  standalone: true,
  template: `
    <header class="topbar">
      <div class="topbar-left">
        <button type="button" class="menu-btn" (click)="sidebar.toggle()" aria-label="Toggle sidebar">
          <svg class="menu-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <path d="M4 12h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <path d="M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
        <span class="topbar-title">Admin panel</span>
      </div>

      <div class="topbar-right">
        @if (auth.user(); as user) {
          <div class="user-chip" [title]="user.email">
            <span class="avatar" aria-hidden="true">{{ auth.getUserInitials() }}</span>
            <span class="user-meta">
              <span class="user-name">{{ displayName() }}</span>
              <span class="user-role">{{ roleLabel() }}</span>
            </span>
          </div>
        }

        <span class="divider" aria-hidden="true"></span>

        <button type="button" class="btn btn-ghost btn-sm logout-btn" (click)="logout()">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
            <path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          Logout
        </button>
      </div>
    </header>
  `,
  styles: `
    .topbar {
      height: var(--header-height);
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--border-light);
      box-shadow: var(--shadow-header);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      position: sticky;
      top: 0;
      z-index: 50;
      gap: 1rem;
    }

    @media (min-width: 1280px) {
      .topbar {
        padding: 0 2rem;
      }
    }

    .topbar-left {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      flex-shrink: 0;
      min-width: 0;
    }

    .topbar-title {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--text-secondary);
      letter-spacing: -0.01em;
      white-space: nowrap;
    }

    @media (max-width: 640px) {
      .topbar-title {
        display: none;
      }
    }

    .menu-btn {
      width: 40px;
      height: 40px;
      border: 1px solid var(--border-light);
      background: var(--white);
      border-radius: var(--radius-xs);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      color: var(--primary-dark);
      padding: 0;
      transition: all var(--transition);
    }

    .menu-btn:hover {
      background: var(--primary-muted);
      border-color: var(--primary-light);
      color: var(--text);
    }

    .menu-icon {
      width: 20px;
      height: 20px;
      display: block;
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-shrink: 0;
    }

    .user-chip {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.375rem 0.75rem 0.375rem 0.375rem;
      border-radius: 999px;
      border: 1px solid var(--border-light);
      background: var(--primary-muted);
      max-width: 220px;
    }

    .avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary-dark), #4d7a9f);
      color: var(--white);
      font-size: 0.75rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      letter-spacing: 0.02em;
    }

    .user-meta {
      display: flex;
      flex-direction: column;
      min-width: 0;
      line-height: 1.25;
    }

    .user-name {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-role {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--primary-dark);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    @media (max-width: 720px) {
      .user-meta {
        display: none;
      }

      .user-chip {
        padding: 0.25rem;
        border: none;
        background: transparent;
      }
    }

    .divider {
      width: 1px;
      height: 28px;
      background: var(--border);
      flex-shrink: 0;
    }

    @media (max-width: 720px) {
      .divider {
        display: none;
      }
    }

    .logout-btn svg {
      width: 16px;
      height: 16px;
    }
  `,
})
export class HeaderComponent {
  protected readonly sidebar = inject(SidebarService);
  protected readonly auth = inject(AuthService);

  protected readonly displayName = computed(() => {
    const user = this.auth.user();
    if (!user) return 'Admin';
    return user.name?.trim() || user.email.split('@')[0];
  });

  protected readonly roleLabel = computed(() => {
    const role = this.auth.user()?.role;
    if (role === 'SuperAdmin') return 'Super admin';
    if (role === 'SubAdmin') return 'Sub-admin';
    return role || 'Admin';
  });

  logout(): void {
    this.auth.logout();
  }
}
