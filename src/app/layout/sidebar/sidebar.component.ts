import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SidebarService } from '../../core/services/sidebar.service';

interface NavChild {
  label: string;
  route: string;
}

interface NavItem {
  label: string;
  route: string;
  icon: string;
  children?: NavChild[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar" [class.collapsed]="sidebar.isCollapsed()">
      <div class="brand">
        @if (sidebar.isCollapsed()) {
          <a routerLink="/dashboard" class="brand-mark" title="1125 Beach Villa">
            <img src="/logo-mark.svg" alt="1125" />
          </a>
        } @else {
          <a routerLink="/dashboard" class="brand-link">
            <img src="/logo.svg" alt="Eleven Twenty-Five Beach Villa" class="brand-logo" />
          </a>
        }
      </div>

      <nav>
        @if (!sidebar.isCollapsed()) {
          <p class="nav-section">Main menu</p>
        }

        @for (item of nav(); track item.route) {
          @if (item.children && !sidebar.isCollapsed()) {
            <div class="nav-group" [class.group-active]="isGroupActive(item)">
              <div class="nav-group-head">
                <span class="icon-wrap">
                  <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                    <path d="M8 6h8M8 10h8M8 14h5" stroke-linecap="round" />
                    <rect x="4" y="3" width="16" height="18" rx="2" />
                  </svg>
                </span>
                <span class="nav-label">{{ item.label }}</span>
              </div>

              <div class="nav-sub-list">
                @for (child of item.children; track child.route) {
                  <a
                    [routerLink]="child.route"
                    routerLinkActive="active"
                    class="nav-sub"
                  >
                    <span class="sub-indicator"></span>
                    <span class="nav-label">{{ child.label }}</span>
                  </a>
                }
              </div>
            </div>
          } @else {
            <a
              [routerLink]="item.children ? item.children[0].route : item.route"
              routerLinkActive="active"
              [class.active]="item.children ? isGroupActive(item) : false"
              [routerLinkActiveOptions]="{ exact: !item.children && item.route === '/dashboard' }"
              [title]="sidebar.isCollapsed() ? item.label : ''"
              class="nav-link"
            >
              <span class="icon-wrap">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                  @switch (item.icon) {
                    @case ('dashboard') {
                      <rect x="3" y="3" width="7" height="7" rx="1.5" />
                      <rect x="14" y="3" width="7" height="7" rx="1.5" />
                      <rect x="3" y="14" width="7" height="7" rx="1.5" />
                      <rect x="14" y="14" width="7" height="7" rx="1.5" />
                    }
                    @case ('rooms') {
                      <path d="M3 11l9-7 9 7" stroke-linecap="round" stroke-linejoin="round" />
                      <path d="M5 10v10h14V10" stroke-linecap="round" stroke-linejoin="round" />
                    }
                    @case ('bookings') {
                      <path d="M8 6h8M8 10h8M8 14h5" stroke-linecap="round" />
                      <rect x="4" y="3" width="16" height="18" rx="2" />
                    }
                    @case ('users') {
                      <circle cx="12" cy="8" r="3.5" />
                      <path d="M5 19c0-3.5 3-6 7-6s7 2.5 7 6" stroke-linecap="round" />
                    }
                    @case ('subscribers') {
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="m3 7 9 6 9-6" stroke-linecap="round" stroke-linejoin="round" />
                    }
                  }
                </svg>
              </span>
              <span class="nav-label">{{ item.label }}</span>
            </a>
          }
        }
      </nav>
    </aside>
  `,
  styles: `
    .sidebar {
      width: var(--sidebar-current, var(--sidebar-width));
      height: 100vh;
      position: fixed;
      left: 0;
      top: 0;
      background: linear-gradient(
        180deg,
        var(--sidebar-bg-top) 0%,
        var(--sidebar-bg-mid) 42%,
        var(--sidebar-bg-bottom) 100%
      );
      display: flex;
      flex-direction: column;
      z-index: 100;
      transition: width var(--transition);
      overflow: hidden;
      box-shadow: 4px 0 28px rgba(26, 43, 60, 0.1);
    }

    .sidebar::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 20% 0%, rgba(255, 255, 255, 0.16), transparent 42%),
        radial-gradient(circle at 100% 100%, rgba(26, 43, 60, 0.08), transparent 36%);
      pointer-events: none;
    }

    .brand,
    nav {
      position: relative;
      z-index: 1;
    }

    .brand {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.125rem 1rem 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      min-height: 72px;
    }

    .brand-link {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
    }

    .brand-logo {
      width: 100%;
      max-width: 132px;
      height: auto;
      display: block;
      filter: drop-shadow(0 2px 8px rgba(26, 43, 60, 0.12));
    }

    .brand-mark {
      display: flex;
      justify-content: center;
      padding: 0.25rem;
      border-radius: 12px;
      transition: background var(--transition);
    }

    .brand-mark:hover {
      background: rgba(255, 255, 255, 0.12);
    }

    .brand-mark img {
      width: 42px;
      height: auto;
    }

    nav {
      flex: 1;
      padding: 1rem 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      overflow-y: auto;
    }

    .nav-section {
      margin: 0 0 0.625rem 0.5rem;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.58);
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem;
      border-radius: 12px;
      color: rgba(255, 255, 255, 0.94);
      font-weight: 500;
      font-size: 0.875rem;
      transition: all var(--transition);
      border: 1px solid transparent;
    }

    .sidebar.collapsed .nav-link {
      justify-content: center;
      padding: 0.5rem;
    }

    .nav-link:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.08);
    }

    .nav-link.active {
      background: var(--white);
      color: var(--primary-dark);
      font-weight: 600;
      border-color: rgba(255, 255, 255, 0.65);
      box-shadow: 0 8px 20px rgba(26, 43, 60, 0.12);
    }

    .nav-link.active .icon-wrap {
      background: var(--primary-soft);
      color: var(--primary-dark);
    }

    .icon-wrap {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.14);
      color: inherit;
      flex-shrink: 0;
      transition: all var(--transition);
    }

    .nav-link:hover .icon-wrap {
      background: rgba(255, 255, 255, 0.2);
    }

    .nav-group {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      padding: 0.375rem 0.5rem 0.625rem;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .nav-group.group-active {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.16);
    }

    .nav-group-head {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.375rem 0.25rem;
      color: rgba(255, 255, 255, 0.92);
      font-weight: 600;
      font-size: 0.875rem;
    }

    .nav-group-head .icon-wrap {
      background: rgba(255, 255, 255, 0.16);
    }

    .nav-sub-list {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      margin-left: 1rem;
      padding-left: 0.875rem;
      border-left: 2px solid rgba(255, 255, 255, 0.18);
    }

    .nav-sub {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.5rem 0.625rem;
      border-radius: 10px;
      color: rgba(255, 255, 255, 0.86);
      font-weight: 500;
      font-size: 0.8125rem;
      transition: all var(--transition);
    }

    .nav-sub:hover {
      background: rgba(255, 255, 255, 0.12);
      color: var(--white);
    }

    .nav-sub.active {
      background: var(--white);
      color: var(--primary-dark);
      font-weight: 600;
      box-shadow: 0 6px 16px rgba(26, 43, 60, 0.1);
    }

    .sub-indicator {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.42);
      flex-shrink: 0;
      transition: all var(--transition);
    }

    .nav-sub.active .sub-indicator {
      background: var(--primary-dark);
      box-shadow: 0 0 0 3px rgba(90, 138, 173, 0.18);
    }

    .nav-icon {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    .nav-label {
      white-space: nowrap;
      overflow: hidden;
      transition: opacity var(--transition);
    }

    .sidebar.collapsed .nav-label,
    .sidebar.collapsed .nav-section {
      display: none;
    }
  `,
})
export class SidebarComponent {
  protected readonly sidebar = inject(SidebarService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  protected readonly nav = computed<NavItem[]>(() => {
    const items: NavItem[] = [
      { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
      { label: 'Rooms & Villas', route: '/rooms', icon: 'rooms' },
      {
        label: 'Bookings',
        route: '/bookings',
        icon: 'bookings',
        children: [
          { label: 'Incomplete', route: '/bookings/incomplete' },
          { label: 'Complete', route: '/bookings/complete' },
          { label: 'Cancelled', route: '/bookings/cancelled' },
        ],
      },
      { label: 'Subscribers', route: '/subscribers', icon: 'subscribers' },
    ];

    if (this.auth.isSuperAdmin()) {
      items.push({ label: 'Sub-admins', route: '/subadmins', icon: 'users' });
    }

    return items;
  });

  isGroupActive(item: NavItem): boolean {
    if (!item.children) return false;
    return item.children.some((child) => this.router.url.startsWith(child.route));
  }
}
