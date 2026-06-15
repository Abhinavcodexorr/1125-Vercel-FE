import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';

const STORAGE_KEY = 'sidebar-collapsed';
const MOBILE_BREAKPOINT = 768;

@Injectable({ providedIn: 'root' })
export class SidebarService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly collapsed = signal(this.readStored());
  private readonly mobileOpen = signal(false);
  private readonly mobileView = signal(false);

  readonly isCollapsed = this.collapsed.asReadonly();
  readonly isMobileOpen = this.mobileOpen.asReadonly();
  readonly isMobile = this.mobileView.asReadonly();

  constructor() {
    if (typeof window === 'undefined') return;

    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const syncViewport = (): void => {
      const mobile = mq.matches;
      this.mobileView.set(mobile);
      if (!mobile) {
        this.mobileOpen.set(false);
      }
    };

    syncViewport();
    mq.addEventListener('change', syncViewport);
    this.destroyRef.onDestroy(() => {
      mq.removeEventListener('change', syncViewport);
      this.document.body.style.overflow = '';
      this.document.body.style.touchAction = '';
    });

    effect(() => {
      const body = this.document.body;
      if (this.mobileOpen()) {
        body.style.overflow = 'hidden';
        body.style.touchAction = 'none';
      } else {
        body.style.overflow = '';
        body.style.touchAction = '';
      }
    });
  }

  toggle(): void {
    if (this.mobileView()) {
      this.mobileOpen.update((open) => !open);
      return;
    }

    this.collapsed.update((value) => {
      const next = !value;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }

  private readStored(): boolean {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  }
}
