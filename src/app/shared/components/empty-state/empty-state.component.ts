import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="empty">
      <div class="icon-ring">
        <span class="icon">{{ icon() }}</span>
      </div>
      <h3>{{ title() }}</h3>
      <p>{{ message() }}</p>
      <div class="empty-actions">
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    .empty {
      text-align: center;
      padding: 3rem 1.75rem;
      background: linear-gradient(180deg, var(--white) 0%, var(--primary-muted) 100%);
      border: 1px solid var(--border-light);
      border-radius: var(--radius);
      box-shadow: var(--shadow-sm);
      animation: fadeIn 0.35s ease;
    }

    .icon-ring {
      width: 72px;
      height: 72px;
      margin: 0 auto 1.125rem;
      border-radius: 50%;
      background: var(--white);
      border: 1px solid var(--border-light);
      box-shadow: var(--shadow-sm);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .icon {
      width: 44px;
      height: 44px;
      background: var(--primary-soft);
      color: var(--primary-dark);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.375rem;
    }

    h3 {
      margin: 0 0 0.4375rem;
      font-size: 1.0625rem;
      font-weight: 600;
      color: var(--text);
    }

    p {
      margin: 0 auto;
      max-width: 28rem;
      color: var(--text-secondary);
      font-size: 0.875rem;
      line-height: 1.55;
    }

    .empty-actions:empty {
      display: none;
    }

    .empty-actions {
      margin-top: 1.25rem;
      display: flex;
      justify-content: center;
      gap: 0.625rem;
      flex-wrap: wrap;
    }
  `,
})
export class EmptyStateComponent {
  readonly icon = input('📋');
  readonly title = input('Nothing here yet');
  readonly message = input('Get started by adding your first item.');
}
