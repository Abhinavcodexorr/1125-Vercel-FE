import { Injectable, signal } from '@angular/core';

export type ConfirmVariant = 'default' | 'danger';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
}

interface ActiveConfirm extends Required<ConfirmOptions> {
  id: number;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private id = 0;
  private resolver: ((value: boolean) => void) | null = null;

  readonly active = signal<ActiveConfirm | null>(null);

  confirm(options: ConfirmOptions | string): Promise<boolean> {
    const opts = typeof options === 'string' ? { message: options } : options;

    return new Promise((resolve) => {
      this.resolver?.(false);
      this.resolver = resolve;
      this.id += 1;
      this.active.set({
        id: this.id,
        title: opts.title ?? 'Please confirm',
        message: opts.message,
        confirmLabel: opts.confirmLabel ?? 'Confirm',
        cancelLabel: opts.cancelLabel ?? 'Cancel',
        variant: opts.variant ?? 'default',
      });
    });
  }

  accept(): void {
    this.resolver?.(true);
    this.close();
  }

  dismiss(): void {
    this.resolver?.(false);
    this.close();
  }

  private close(): void {
    this.resolver = null;
    this.active.set(null);
  }
}
