import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <header class="page-header" [class.centered]="centered()">
      <div>
        <h1>{{ title() }}</h1>
        @if (subtitle()) {
          <p>{{ subtitle() }}</p>
        }
      </div>
      <div class="actions">
        <ng-content />
      </div>
    </header>
  `,
  styles: `
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.75rem;
      animation: fadeIn 0.35s ease;
    }

    .page-header.centered {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .page-header.centered .actions {
      justify-content: center;
    }

    h1 {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 600;
      color: var(--text);
      letter-spacing: -0.02em;
    }

    p {
      margin: 0.375rem 0 0;
      color: var(--text-secondary);
      font-size: 1rem;
    }

    .actions {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      flex-shrink: 0;
    }
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly centered = input(false);
}
