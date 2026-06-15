import { Component, HostListener, inject } from '@angular/core';
import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    @if (confirm.active(); as dialog) {
      <div class="overlay" (click)="confirm.dismiss()" role="presentation">
        <div
          class="dialog"
          [class.danger]="dialog.variant === 'danger'"
          (click)="$event.stopPropagation()"
          role="alertdialog"
          [attr.aria-labelledby]="'confirm-title-' + dialog.id"
          [attr.aria-describedby]="'confirm-message-' + dialog.id"
        >
          <div class="dialog-accent" aria-hidden="true"></div>

          <div class="dialog-body">
            <div class="dialog-icon" aria-hidden="true">
              @if (dialog.variant === 'danger') {
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                    stroke="currentColor"
                    stroke-width="1.75"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              } @else {
                <svg viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.75" />
                  <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
                </svg>
              }
            </div>

            <h2 class="dialog-title" [id]="'confirm-title-' + dialog.id">{{ dialog.title }}</h2>
            <p class="dialog-message" [id]="'confirm-message-' + dialog.id">{{ dialog.message }}</p>
          </div>

          <div class="dialog-actions">
            <button type="button" class="btn btn-ghost" (click)="confirm.dismiss()">
              {{ dialog.cancelLabel }}
            </button>
            <button
              type="button"
              class="btn"
              [class.btn-primary]="dialog.variant === 'default'"
              [class.btn-danger-solid]="dialog.variant === 'danger'"
              (click)="confirm.accept()"
            >
              {{ dialog.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .overlay {
      position: fixed;
      inset: 0;
      z-index: 1100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      background: rgba(26, 43, 60, 0.42);
      backdrop-filter: blur(4px);
      animation: fadeIn 0.2s ease;
    }

    .dialog {
      position: relative;
      width: 100%;
      max-width: 420px;
      background: var(--white);
      border: 1px solid var(--border-light);
      border-radius: var(--radius);
      box-shadow: var(--shadow-md);
      overflow: hidden;
      animation: dialogIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .dialog-accent {
      height: 4px;
      background: linear-gradient(90deg, var(--primary-dark), var(--primary-light));
    }

    .dialog.danger .dialog-accent {
      background: linear-gradient(90deg, #b42318, var(--danger));
    }

    .dialog-body {
      padding: 1.5rem 1.5rem 1.25rem;
      text-align: center;
    }

    .dialog-icon {
      width: 52px;
      height: 52px;
      margin: 0 auto 1rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--primary-soft);
      color: var(--primary-dark);
    }

    .dialog.danger .dialog-icon {
      background: #fdeaea;
      color: var(--danger);
    }

    .dialog-icon svg {
      width: 26px;
      height: 26px;
    }

    .dialog-title {
      margin: 0 0 0.5rem;
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--text);
      letter-spacing: -0.02em;
    }

    .dialog-message {
      margin: 0;
      font-size: 0.9375rem;
      line-height: 1.55;
      color: var(--text-secondary);
    }

    .dialog-actions {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 0.625rem;
      padding: 0 1.5rem 1.5rem;
    }

    .btn-danger-solid {
      background: var(--danger);
      color: var(--white);
      border: none;
      box-shadow: 0 1px 2px rgba(26, 43, 60, 0.08);
    }

    .btn-danger-solid:hover {
      background: #b42318;
      transform: translateY(-1px);
      box-shadow: 0 2px 6px rgba(180, 35, 24, 0.2);
    }

    @keyframes dialogIn {
      from {
        opacity: 0;
        transform: translate3d(0, 10px, 0) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translate3d(0, 0, 0) scale(1);
      }
    }

    @media (max-width: 640px) {
      .overlay {
        align-items: flex-end;
        padding: 0.75rem;
      }

      .dialog-actions {
        flex-direction: column-reverse;
        align-items: stretch;
      }

      .dialog-actions .btn {
        width: 100%;
      }
    }
  `,
})
export class ConfirmDialogComponent {
  protected readonly confirm = inject(ConfirmService);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.confirm.active()) {
      this.confirm.dismiss();
    }
  }
}
