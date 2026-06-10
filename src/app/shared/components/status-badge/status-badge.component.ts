import { Component, input } from '@angular/core';
import { ItemStatus, statusLabel } from '../../../core/models/status.model';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `
    <span class="badge-status" [class]="badgeClass()">{{ statusLabel(status()) }}</span>
  `,
  styles: `
    :host {
      display: inline-block;
    }
  `,
})
export class StatusBadgeComponent {
  readonly status = input.required<ItemStatus>();

  statusLabel = statusLabel;

  badgeClass(): string {
    switch (this.status()) {
      case 'active':
        return 'badge-active';
      case 'inactive':
        return 'badge-inactive';
      case 'deleted':
        return 'badge-deleted';
      default:
        return 'badge-inactive';
    }
  }
}
