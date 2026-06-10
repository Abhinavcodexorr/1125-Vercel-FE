import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
      background: var(--bg);
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
      padding: 1.75rem 2.25rem 2.5rem;
      animation: fadeIn 0.4s ease;
      max-width: 100%;
      min-width: 0;
    }
  `,
})
export class AdminLayoutComponent {
  protected readonly sidebar = inject(SidebarService);
}
