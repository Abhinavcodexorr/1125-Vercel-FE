import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <header class="page-header" [class.centered]="centered()">
      <div class="page-header-text">
        <p class="eyebrow">1125 Beach Villa</p>
        <h1>{{ title() }}</h1>
        @if (subtitle()) {
          <p class="subtitle">{{ subtitle() }}</p>
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
      align-items: flex-end;
      justify-content: space-between;
      gap: 1.25rem;
      margin-bottom: 1.5rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid var(--border-light);
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

    .page-header-text {
      position: relative;
      padding-left: 0.875rem;
      min-width: 0;
    }

    .page-header.centered .page-header-text {
      padding-left: 0;
    }

    .page-header-text::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0.125rem;
      bottom: 0.125rem;
      width: 3px;
      border-radius: 999px;
      background: linear-gradient(180deg, var(--primary-dark), var(--primary-light));
    }

    .page-header.centered .page-header-text::before {
      display: none;
    }

    .eyebrow {
      margin: 0 0 0.25rem;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--primary-dark);
    }

    h1 {
      margin: 0;
      font-size: 1.625rem;
      font-weight: 700;
      color: var(--text);
      letter-spacing: -0.025em;
      line-height: 1.2;
    }

    .subtitle {
      margin: 0.4375rem 0 0;
      color: var(--text-secondary);
      font-size: 0.9375rem;
      max-width: 42rem;
      line-height: 1.5;
    }

    .actions {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      flex-shrink: 0;
      padding-bottom: 0.125rem;
    }

    @media (max-width: 720px) {
      .page-header {
        flex-direction: column;
        align-items: stretch;
      }

      .actions {
        justify-content: flex-start;
        padding-bottom: 0;
      }
    }
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly centered = input(false);
}
