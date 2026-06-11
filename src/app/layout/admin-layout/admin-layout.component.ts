import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SidebarService } from '../../core/services/sidebar.service';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent],
  template: `
    <div class="shell" [class.sidebar-collapsed]="sidebar.isCollapsed()">
      <app-sidebar />
      <div class="main">
        <app-header />
        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: `
    .shell {
      --sidebar-current: var(--sidebar-width);
      min-height: 100vh;
      background:
        radial-gradient(circle at 100% 0%, rgba(124, 165, 200, 0.08), transparent 38%),
        radial-gradient(circle at 0% 100%, rgba(90, 138, 173, 0.06), transparent 32%),
        var(--bg);
    }

    .shell.sidebar-collapsed {
      --sidebar-current: var(--sidebar-width-collapsed);
    }

    .main {
      margin-left: var(--sidebar-current);
      min-height: 100vh;
      min-width: 0;
      transition: margin-left var(--transition);
    }

    .content {
      padding: 1.5rem 1.75rem 2.25rem;
      animation: fadeIn 0.4s ease;
      max-width: var(--content-max-width);
      margin: 0 auto;
      min-width: 0;
    }

    @media (min-width: 1280px) {
      .content {
        padding: 1.75rem 2.25rem 2.5rem;
      }
    }
  `,
})
export class AdminLayoutComponent implements OnInit {
  protected readonly sidebar = inject(SidebarService);
  private readonly auth = inject(AuthService);

  ngOnInit(): void {
    this.auth.refreshSession();
  }
}
