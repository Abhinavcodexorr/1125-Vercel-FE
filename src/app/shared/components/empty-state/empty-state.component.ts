import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="empty">
      <div class="icon">{{ icon() }}</div>
      <h3>{{ title() }}</h3>
      <p>{{ message() }}</p>
      <ng-content />
    </div>
  `,
  styles: `
    .empty {
      text-align: center;
      padding: 3rem 1.5rem;
      background: var(--white);
      border: 1px dashed var(--border);
      border-radius: var(--radius);
      animation: fadeIn 0.35s ease;
    }

    .icon {
      width: 56px;
      height: 56px;
      margin: 0 auto 1rem;
      background: var(--primary-soft);
      color: var(--primary-dark);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }

    h3 {
      margin: 0 0 0.375rem;
      font-size: 1rem;
      font-weight: 600;
    }

    p {
      margin: 0 0 1rem;
      color: var(--text-secondary);
      font-size: 0.875rem;
    }
  `,
})
export class EmptyStateComponent {
  readonly icon = input('📋');
  readonly title = input('Nothing here yet');
  readonly message = input('Get started by adding your first item.');
}
