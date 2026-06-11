import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RoomCreatePayload, RoomImage, RoomUpdatePayload } from '../../core/models/room.model';
import { RoomApiService } from '../../core/services/room-api.service';
import { UploadService } from '../../core/services/upload.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-room-form',
  standalone: true,
  imports: [PageHeaderComponent, ReactiveFormsModule, RouterLink],
  template: `
    <div class="room-form-page">
      <app-page-header [title]="isEdit ? 'Edit room' : 'Add room'" />

      @if (error()) {
        <div class="alert alert-error">{{ error() }}</div>
      }

      @if (loading()) {
        <div class="form-shell card"><p>Loading room…</p></div>
      } @else {
        <form id="room-form" class="form-shell" [formGroup]="form" (ngSubmit)="save()" novalidate>
          <div class="form-grid">
            <section class="panel card details-panel">
            <h2 class="panel-title">Details</h2>

            <div class="fields-2">
              <div class="form-group compact">
                <label>Type *</label>
                <input formControlName="type" placeholder="5-Bedroom Beach Residence" />
              </div>
              <div class="form-group compact">
                <label>Title *</label>
                <input formControlName="title" placeholder="The Villa" />
              </div>
            </div>

            <div class="form-group compact">
              <label>Description</label>
              <textarea formControlName="description" rows="3"></textarea>
            </div>

            <div class="form-group compact">
              <label>Amenities</label>
              <input formControlName="amenitiesText" placeholder="WiFi, Pool, Beach Access" />
            </div>

            <div class="compact-row">
              <div class="form-group compact field-short">
                <label>Guests *</label>
                <input type="number" formControlName="guests" min="1" />
              </div>
              <div class="form-group compact field-short">
                <label>Quantity</label>
                <input type="number" formControlName="quantity" placeholder="1" />
              </div>
              <div class="form-group compact field-price">
                <label>Price / night *</label>
                <div class="input-with-symbol">
                  <span class="symbol">{{ priceSymbol() }}</span>
                  <input type="number" formControlName="price" min="0" />
                </div>
              </div>
              <div class="form-group compact field-currency">
                <label>Currency *</label>
                <div class="currency-select-wrap">
                  <span class="symbol">{{ priceSymbol() }}</span>
                  <select formControlName="currency">
                    @for (option of currencyOptions; track option.code) {
                      <option [value]="option.code">{{ option.symbol }} {{ option.label }}</option>
                    }
                  </select>
                </div>
              </div>
            </div>

            <div class="compact-row">
              <div class="form-group compact field-short">
                <label>Size *</label>
                <input type="number" formControlName="size" min="1" placeholder="450" />
              </div>
              <div class="form-group compact field-unit">
                <label>Unit</label>
                <input formControlName="unit" placeholder="sq m" />
              </div>
            </div>

            <label class="active-toggle">
              <input type="checkbox" formControlName="isActive" />
              Active listing
            </label>

            <div class="form-actions">
              <a routerLink="/rooms" class="btn btn-ghost">Cancel</a>
              <button
                type="submit"
                class="btn btn-primary"
                [disabled]="form.invalid || saving() || uploading()"
              >
                {{ saving() ? 'Saving…' : isEdit ? 'Update' : 'Create' }}
              </button>
            </div>
          </section>

          <section class="panel card">
            <div class="panel-head">
              <h2 class="panel-title">Images</h2>
              <input
                #fileInput
                type="file"
                accept="image/*"
                multiple
                class="file-input"
                (change)="onFilesSelected($event)"
              />
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                (click)="fileInput.click()"
                [disabled]="uploading()"
              >
                {{ uploading() ? 'Uploading…' : '+ Upload' }}
              </button>
            </div>

            @if (uploadError()) {
              <div class="alert alert-error">{{ uploadError() }}</div>
            }

            @if (images().length > 0) {
              <ul class="image-strip">
                @for (img of images(); track img.url) {
                  <li class="image-thumb">
                    <img [src]="img.url" alt="Room" />
                    <button type="button" class="remove-btn" (click)="removeImage(img.url)" aria-label="Remove">
                      ×
                    </button>
                  </li>
                }
              </ul>
            } @else {
              <div class="empty-images" (click)="fileInput.click()">
                <span>Click to upload room photos</span>
              </div>
            }
          </section>
        </div>
        </form>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: calc(100vh - var(--header-height) - 4.25rem);
      max-height: calc(100vh - var(--header-height) - 4.25rem);
      overflow-y: auto;
      overflow-x: hidden;
    }

    .room-form-page {
      min-height: min-content;
    }

    .room-form-page ::ng-deep .page-header {
      margin-bottom: 1.25rem;
    }

    .form-shell {
      width: 100%;
    }

    .form-shell.card {
      padding: 1.25rem;
    }

    .form-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
      gap: 1.25rem;
      align-items: start;
    }

    .panel {
      padding: 1.25rem 1.35rem;
      overflow: visible;
    }

    .panel-title {
      margin: 0 0 1rem;
      font-size: 0.9375rem;
      font-weight: 700;
      color: var(--text);
      letter-spacing: -0.01em;
    }

    .panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .panel-head .panel-title {
      margin: 0;
    }

    .fields-2,
    .fields-3,
    .fields-4 {
      display: grid;
      gap: 0.75rem 1rem;
    }

    .fields-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .fields-3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .fields-4 {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .compact-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem 1rem;
      align-items: flex-end;
      margin-bottom: 0.75rem;
    }

    .compact-row .form-group.compact {
      margin-bottom: 0;
    }

    .field-short {
      width: 88px;
      flex-shrink: 0;
    }

    .field-price {
      width: 132px;
      flex-shrink: 0;
    }

    .field-currency {
      width: 168px;
      flex-shrink: 0;
    }

    .field-unit {
      width: 96px;
      flex-shrink: 0;
    }

    .input-with-symbol {
      position: relative;
      width: 100%;
    }

    .input-with-symbol .symbol {
      position: absolute;
      left: 0.875rem;
      top: 50%;
      transform: translateY(-50%);
      z-index: 1;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-muted);
      pointer-events: none;
      line-height: 1;
    }

    :host .form-group.compact {
      margin-bottom: 0.75rem;
    }

    :host .form-group.compact label {
      margin-bottom: 0.35rem;
      font-size: 0.8125rem;
    }

    :host .form-group.compact input,
    :host .form-group.compact textarea {
      padding: 0.625rem 0.875rem;
      font-size: 0.875rem;
    }

    :host .form-group.compact .input-with-symbol input {
      width: 100%;
      padding: 0.625rem 0.875rem 0.625rem 2rem;
    }

    .currency-select-wrap {
      position: relative;
      width: 100%;
    }

    .currency-select-wrap .symbol {
      position: absolute;
      left: 0.875rem;
      top: 50%;
      transform: translateY(-50%);
      z-index: 1;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-muted);
      pointer-events: none;
      line-height: 1;
    }

    :host .form-group.compact .currency-select-wrap select {
      width: 100%;
      padding: 0.625rem 0.875rem 0.625rem 2rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--white);
      color: var(--text);
      font-size: 0.875rem;
      cursor: pointer;
    }

    :host .form-group.compact .currency-select-wrap select:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(124, 165, 200, 0.2);
    }

    :host .form-group.compact textarea {
      min-height: 72px;
    }

    .active-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.25rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-secondary);
      cursor: pointer;
    }

    .active-toggle input {
      width: auto;
    }

    .form-actions {
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.25rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--border-light);
    }

    .form-actions .btn {
      flex: 0 0 auto;
      width: auto;
      min-width: 6.5rem;
    }

    .file-input {
      display: none;
    }

    .image-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 0.625rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .image-thumb {
      position: relative;
      width: 96px;
      height: 96px;
      border-radius: var(--radius-sm);
      overflow: hidden;
      border: 1px solid var(--border-light);
      flex-shrink: 0;
    }

    .image-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .remove-btn {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 22px;
      height: 22px;
      border: none;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.55);
      color: #fff;
      font-size: 1rem;
      line-height: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .empty-images {
      min-height: 140px;
      border: 1px dashed var(--border);
      border-radius: var(--radius-sm);
      background: var(--primary-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.875rem;
      cursor: pointer;
    }

    @media (max-width: 1024px) {
      .fields-4 {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 860px) {
      :host {
        height: auto;
        max-height: none;
        overflow: visible;
      }

      .form-grid {
        grid-template-columns: 1fr;
      }

      .fields-2,
      .fields-3 {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class RoomFormComponent implements OnInit {
  private readonly roomApi = inject(RoomApiService);
  private readonly uploadService = inject(UploadService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly currencyOptions = [
    { code: 'USD', label: 'US Dollar', symbol: '$' },
    { code: 'GHS', label: 'Ghana Cedi', symbol: '₵' },
  ] as const;

  protected readonly priceSymbol = signal('$');

  protected isEdit = false;
  private roomIdOrSlug = '';

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly uploading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly uploadError = signal<string | null>(null);
  protected readonly images = signal<RoomImage[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    type: ['', Validators.required],
    title: ['', Validators.required],
    description: [''],
    guests: [2, [Validators.required, Validators.min(1)]],
    quantity: this.fb.control<number | null>(null, Validators.min(1)),
    price: [0, [Validators.required, Validators.min(0)]],
    size: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
    unit: ['sq ft'],
    currency: ['USD', Validators.required],
    amenitiesText: [''],
    isActive: [true],
  });

  ngOnInit(): void {
    this.syncPriceSymbol(this.form.controls.currency.value);
    this.form.controls.currency.valueChanges.subscribe((code) => this.syncPriceSymbol(code));

    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.isEdit = true;
      this.roomIdOrSlug = id;
      this.loading.set(true);
      this.roomApi.getOne(id).subscribe({
        next: (room) => {
          this.form.patchValue({
            type: room.type,
            title: room.title,
            description: room.description,
            guests: room.guests,
            quantity: room.quantity ?? null,
            price: room.price,
            size: room.size > 0 ? room.size : null,
            unit: room.unit || 'sq ft',
            currency: room.currency || 'USD',
            amenitiesText: room.amenities.map((a) => a.name).join(', '),
            isActive: room.isActive,
          });
          this.syncPriceSymbol(room.currency || 'USD');
          this.images.set([...room.images].sort((a, b) => a.order - b.order));
          this.roomIdOrSlug = room.id || room.slug;
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load room.');
          this.loading.set(false);
          this.router.navigate(['/rooms']);
        },
      });
    }
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    input.value = '';

    if (!files.length) return;

    this.uploading.set(true);
    this.uploadError.set(null);

    const startOrder = this.images().length;
    this.uploadService.uploadRoomImages(files, startOrder).subscribe({
      next: (uploaded) => {
        this.images.update((list) => [...list, ...uploaded].sort((a, b) => a.order - b.order));
        this.uploading.set(false);
      },
      error: (err: Error) => {
        this.uploadError.set(err.message);
        this.uploading.set(false);
      },
    });
  }

  removeImage(url: string): void {
    this.images.update((list) =>
      list
        .filter((img) => img.url !== url)
        .map((img, order) => ({ ...img, order })),
    );
  }

  private syncPriceSymbol(code: string): void {
    const symbol =
      this.currencyOptions.find((option) => option.code === code)?.symbol ?? '$';
    this.priceSymbol.set(symbol);
  }

  save(): void {
    if (this.form.invalid || this.uploading()) return;

    this.saving.set(true);
    this.error.set(null);

    const raw = this.form.getRawValue();
    const title = raw.title.trim();
    const amenities = raw.amenitiesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => {
        const key = name.toLowerCase().replace(/\s+/g, '_');
        return {
          key,
          name,
          icon: key,
          iconType: 'material' as const,
        };
      });

    const base: RoomCreatePayload | RoomUpdatePayload = {
      title,
      type: raw.type.trim(),
      description: raw.description,
      price: raw.price,
      currency: raw.currency.trim().toUpperCase(),
      guests: raw.guests,
      quantity: raw.quantity ?? 1,
      size: raw.size ?? 1,
      unit: raw.unit.trim() || 'sq ft',
      amenities,
      images: this.images(),
      isActive: raw.isActive,
    };

    if (!this.isEdit) {
      base.slug = slugify(title);
    }

    const request = this.isEdit
      ? this.roomApi.update(this.roomIdOrSlug, base)
      : this.roomApi.create(base as RoomCreatePayload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/rooms']);
      },
      error: () => {
        this.saving.set(false);
        this.error.set(this.roomApi.error() ?? 'Failed to save room.');
      },
    });
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
