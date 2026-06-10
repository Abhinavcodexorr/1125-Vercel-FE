import { Component, inject } from '@angular/core';
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
      </div>
      <div class="topbar-right">
        <button type="button" class="btn btn-ghost btn-sm logout-btn" (click)="logout()">
          Logout
        </button>
      </div>
    </header>
  `,
  styles: `
    .topbar {
      height: var(--header-height);
      background: var(--white);
      border-bottom: 1px solid var(--border-light);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 2rem;
      position: sticky;
      top: 0;
      z-index: 50;
      gap: 1rem;
    }

    .topbar-left {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .menu-btn {
      width: 42px;
      height: 42px;
      border: 1px solid var(--border-light);
      background: var(--white);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      color: var(--primary-dark);
      padding: 0;
      overflow: visible;
      transition: all var(--transition);
    }

    .menu-btn:hover {
      background: var(--primary-muted);
      border-color: var(--primary-light);
    }

    .menu-icon {
      width: 22px;
      height: 22px;
      display: block;
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      flex-shrink: 0;
    }
  `,
})
export class HeaderComponent {
  protected readonly sidebar = inject(SidebarService);
  protected readonly auth = inject(AuthService);

  logout(): void {
    this.auth.logout();
  }
}
