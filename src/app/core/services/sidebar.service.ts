import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'sidebar-collapsed';

@Injectable({ providedIn: 'root' })
export class SidebarService {
  private readonly collapsed = signal(this.readStored());

  readonly isCollapsed = this.collapsed.asReadonly();

  toggle(): void {
    this.collapsed.update((v) => {
      const next = !v;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  private readStored(): boolean {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  }
}
