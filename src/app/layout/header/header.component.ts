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
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
            <path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span class="logout-label">Logout</span>
        </button>
      </div>
    </header>
  `,
  styles: `
    .topbar {
      height: var(--header-height);
      background: rgba(255, 255, 255, 0.96);
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
      flex-shrink: 0;
      gap: 0.75rem;
      width: 100%;
      max-width: 100%;
      min-width: 0;
    }

    @media (min-width: 1280px) {
      .topbar {
        padding: 0 2rem;
      }
    }

    .topbar-left {
      display: flex;
      align-items: center;
      flex-shrink: 0;
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
      gap: 0.5rem;
      flex-shrink: 1;
      min-width: 0;
      margin-left: auto;
    }

    .logout-btn svg {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    @media (max-width: 768px) {
      .topbar {
        padding: 0 1rem;
      }
    }

    @media (max-width: 480px) {
      .topbar {
        padding: 0 0.75rem;
        gap: 0.5rem;
      }

      .logout-label {
        display: none;
      }

      .logout-btn {
        padding: 0.5rem;
        min-width: 40px;
      }
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
