import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  template: `
    <div class="overlay" (click)="onBackdrop()">
      <div class="modal" (click)="$event.stopPropagation()" role="dialog">
        <div class="modal-header">
          <h2>{{ title() }}</h2>
          <button type="button" class="close" (click)="closed.emit()" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <ng-content />
        </div>
        @if (showFooter()) {
          <div class="modal-footer">
            <ng-content select="[modal-footer]" />
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(26, 43, 60, 0.35);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
      animation: fadeIn 0.2s ease;
    }

    .modal {
      background: var(--white);
      border-radius: var(--radius);
      width: 100%;
      max-width: 520px;
      max-height: 90vh;
      overflow: auto;
      box-shadow: var(--shadow-md);
      animation: fadeIn 0.28s ease;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-light);
    }

    h2 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .close {
      width: 32px;
      height: 32px;
      border: none;
      background: var(--primary-soft);
      color: var(--primary-dark);
      border-radius: var(--radius-sm);
      font-size: 1.25rem;
      line-height: 1;
      cursor: pointer;
      transition: background var(--transition);
    }

    .close:hover {
      background: var(--primary-light);
    }

    .modal-body {
      padding: 1.5rem;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: 0.625rem;
      padding: 1rem 1.5rem 1.25rem;
      border-top: 1px solid var(--border-light);
    }

    @media (max-width: 640px) {
      .overlay {
        padding: 0.75rem;
        align-items: flex-end;
      }

      .modal {
        max-height: 92vh;
      }

      .modal-header,
      .modal-body,
      .modal-footer {
        padding-left: 1rem;
        padding-right: 1rem;
      }

      .modal-footer {
        flex-direction: column-reverse;
        align-items: stretch;
      }

      .modal-footer .btn {
        width: 100%;
      }
    }
  `,
})
export class ModalComponent {
  readonly title = input.required<string>();
  readonly showFooter = input(true);
  readonly closed = output<void>();

  onBackdrop(): void {
    this.closed.emit();
  }
}
