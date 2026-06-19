import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  CURRENCY_OPTIONS,
  currencyDisplaySymbol,
  normalizeCurrencyCode,
} from '../../core/constants/currencies';
import {
  findPredefinedAmenity,
  PREDEFINED_ROOM_AMENITIES,
} from '../../core/constants/room-amenities';
import { RoomAmenity, RoomCreatePayload, RoomImage, RoomUpdatePayload } from '../../core/models/room.model';
import { RoomApiService } from '../../core/services/room-api.service';
import { UploadService } from '../../core/services/upload.service';
import { RoomAmenityIconComponent } from '../../shared/components/room-amenity-icon/room-amenity-icon.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-room-form',
  standalone: true,
  imports: [PageHeaderComponent, ReactiveFormsModule, RouterLink, RoomAmenityIconComponent],
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

            <div class="form-group compact amenities-group">
              <label>Amenities</label>
              <div class="amenities-grid" role="group" aria-label="Room amenities">
                @for (amenity of predefinedAmenities; track amenity.key) {
                  <button
                    type="button"
                    class="amenity-option"
                    [class.selected]="isAmenitySelected(amenity.key)"
                    [attr.aria-pressed]="isAmenitySelected(amenity.key)"
                    (click)="toggleAmenity(amenity.key)"
                  >
                    <span class="amenity-icon-wrap">
                      <app-room-amenity-icon [icon]="amenity.icon" />
                    </span>
                    <span class="amenity-label">{{ amenity.name }}</span>
                  </button>
                }
              </div>

              <label class="other-amenity-toggle">
                <input type="checkbox" formControlName="showOtherAmenities" />
                Other
              </label>

              @if (form.controls.showOtherAmenities.value) {
                <input
                  formControlName="otherAmenitiesText"
                  placeholder="e.g. Pool, Ocean View, Private Deck"
                />
                <p class="amenities-hint">Separate custom amenities with commas.</p>
              }
            </div>

            <div class="compact-row">
              <div class="form-group compact field-short">
                <label>Guests *</label>
                <input type="number" formControlName="guests" min="1" />
              </div>
              <div class="form-group compact field-quantity">
                <label>Quantity</label>
                <div class="quantity-stepper">
                  <button
                    type="button"
                    class="stepper-btn"
                    (click)="adjustQuantity(-1)"
                    [disabled]="(form.controls.quantity.value ?? 1) <= 1"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    formControlName="quantity"
                    min="1"
                    (blur)="clampQuantity()"
                  />
                  <button
                    type="button"
                    class="stepper-btn"
                    (click)="adjustQuantity(1)"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>
              <div class="form-group compact field-price">
                <label>Price / night *</label>
                <div class="input-with-symbol" [class.symbol-wide]="priceSymbol().length > 1">
                  <span class="symbol">{{ priceSymbol() }}</span>
                  <input type="number" formControlName="price" min="0" />
                </div>
              </div>
              <div class="form-group compact field-currency">
                <label>Currency *</label>
                <select formControlName="currency" class="form-select">
                  @for (option of currencyOptions; track option.code) {
                    <option [value]="option.code">{{ option.symbol }} {{ option.label }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="compact-row">
              <div class="form-group compact field-short">
                <label>Size *</label>
                <input type="number" formControlName="size" min="1" placeholder="450" />
              </div>
              <div class="form-group compact field-unit">
                <label>Unit</label>
                <select formControlName="unit" class="form-select">
                  @for (option of unitOptions; track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
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
              <p class="images-hint">Use arrows to change image order. First image is the cover.</p>
              <ul class="image-strip">
                @for (img of images(); track img.url; let i = $index) {
                  <li class="image-thumb">
                    <img [src]="img.url" alt="Room photo {{ i + 1 }}" />
                    @if (images().length > 1) {
                      <div class="reorder-bar">
                        <button
                          type="button"
                          class="reorder-btn"
                          (click)="moveImage(i, -1)"
                          [disabled]="i === 0"
                          aria-label="Move image earlier"
                        >
                          ‹
                        </button>
                        <span class="order-badge">{{ i + 1 }}</span>
                        <button
                          type="button"
                          class="reorder-btn"
                          (click)="moveImage(i, 1)"
                          [disabled]="i === images().length - 1"
                          aria-label="Move image later"
                        >
                          ›
                        </button>
                      </div>
                    }
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
      width: 100%;
      max-width: 100%;
      min-width: 0;
    }

    @media (min-width: 1025px) {
      :host {
        height: calc(100vh - var(--header-height) - 4.25rem);
        max-height: calc(100vh - var(--header-height) - 4.25rem);
        overflow-y: auto;
        overflow-x: hidden;
      }
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

    .field-quantity {
      width: 120px;
      flex-shrink: 0;
    }

    .quantity-stepper {
      display: flex;
      align-items: stretch;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      overflow: hidden;
      background: var(--white);
    }

    .quantity-stepper input {
      flex: 1;
      min-width: 0;
      width: 100%;
      border: none;
      border-radius: 0;
      text-align: center;
      padding: 0.625rem 0.25rem;
      font-size: 0.875rem;
      -moz-appearance: textfield;
      appearance: textfield;
    }

    .quantity-stepper input::-webkit-outer-spin-button,
    .quantity-stepper input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }

    .quantity-stepper input:focus {
      outline: none;
      box-shadow: inset 0 0 0 2px rgba(124, 165, 200, 0.2);
    }

    .stepper-btn {
      flex-shrink: 0;
      width: 2rem;
      border: none;
      background: var(--primary-muted);
      color: var(--text);
      font-size: 1rem;
      font-weight: 600;
      line-height: 1;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.15s ease;
    }

    .stepper-btn:first-child {
      border-right: 1px solid var(--border-light);
    }

    .stepper-btn:last-child {
      border-left: 1px solid var(--border-light);
    }

    .stepper-btn:hover:not(:disabled) {
      background: var(--primary-light);
    }

    .stepper-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
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

    :host .form-group.compact .input-with-symbol.symbol-wide input {
      padding-left: 2.75rem;
    }

    :host .form-group.compact .quantity-stepper input {
      padding: 0.625rem 0.25rem;
      border: none;
      box-shadow: none;
    }

    :host .form-group.compact .form-select,
    :host .form-group.compact select.form-select {
      width: 100%;
      padding: 0.625rem 0.875rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--white);
      color: var(--text);
      font-size: 0.875rem;
      cursor: pointer;
    }

    :host .form-group.compact .form-select:focus,
    :host .form-group.compact select.form-select:focus {
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

    .images-hint {
      margin: 0 0 0.75rem;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .reorder-bar {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.25rem;
      padding: 0.25rem;
      background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.72) 100%);
    }

    .reorder-btn {
      width: 22px;
      height: 22px;
      border: none;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.92);
      color: var(--text);
      font-size: 0.875rem;
      line-height: 1;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .reorder-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .order-badge {
      min-width: 1rem;
      text-align: center;
      font-size: 0.625rem;
      font-weight: 700;
      color: #fff;
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

    .amenities-group label {
      display: block;
    }

    .amenities-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.625rem;
      margin-bottom: 0.75rem;
    }

    .amenity-option {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      min-height: 3rem;
      padding: 0.625rem 0.75rem;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      background: var(--white);
      color: var(--text);
      font-family: inherit;
      font-size: 0.8125rem;
      font-weight: 500;
      text-align: left;
      cursor: pointer;
      transition:
        border-color 0.18s ease,
        background-color 0.18s ease,
        box-shadow 0.18s ease;
    }

    .amenity-option:hover {
      border-color: var(--primary-light);
      background: var(--primary-muted);
    }

    .amenity-option.selected {
      border-color: #8b2942;
      background: #fdf7f8;
      box-shadow: inset 0 0 0 1px rgba(139, 41, 66, 0.12);
    }

    .amenity-icon-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.75rem;
      color: #8b2942;
      flex-shrink: 0;
    }

    .amenity-label {
      line-height: 1.25;
    }

    .other-amenity-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-secondary);
      cursor: pointer;
    }

    .other-amenity-toggle input {
      width: auto;
    }

    .amenities-hint {
      margin: 0.35rem 0 0;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    @media (max-width: 1024px) {
      .fields-4 {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 860px) {
      .form-grid {
        grid-template-columns: 1fr;
      }

      .fields-2,
      .fields-3 {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
      .form-actions {
        flex-wrap: wrap;
        justify-content: stretch;
      }

      .form-actions .btn {
        flex: 1 1 calc(50% - 0.375rem);
        min-width: 0;
      }

      .amenities-grid {
        grid-template-columns: 1fr;
      }

      .compact-row {
        flex-direction: column;
        align-items: stretch;
      }

      .field-short,
      .field-quantity,
      .field-price,
      .field-currency,
      .field-unit {
        width: 100%;
        flex: none;
      }

      .fields-4 {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 480px) {
      .form-actions .btn {
        flex: 1 1 100%;
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

  protected readonly currencyOptions = CURRENCY_OPTIONS;

  protected readonly unitOptions = [
    { value: 'sq ft', label: 'sq ft' },
    { value: 'sq m', label: 'sq m' },
  ] as const;

  protected readonly predefinedAmenities = PREDEFINED_ROOM_AMENITIES;
  protected readonly selectedAmenityKeys = signal<Set<string>>(new Set());

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
    quantity: [1, [Validators.required, Validators.min(1)]],
    price: [0, [Validators.required, Validators.min(0)]],
    size: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
    unit: ['sq ft'],
    currency: ['USD', Validators.required],
    showOtherAmenities: [false],
    otherAmenitiesText: [''],
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
            quantity: room.quantity ?? 1,
            price: room.price,
            size: room.size > 0 ? room.size : null,
            unit: normalizeUnit(room.unit),
            currency: normalizeCurrencyCode(room.currency),
            isActive: room.isActive,
          });
          this.applyAmenitiesFromRoom(room.amenities);
          this.syncPriceSymbol(normalizeCurrencyCode(room.currency));
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

  moveImage(index: number, direction: -1 | 1): void {
    this.images.update((list) => {
      const target = index + direction;
      if (target < 0 || target >= list.length) return list;

      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((img, order) => ({ ...img, order }));
    });
  }

  protected isAmenitySelected(key: string): boolean {
    return this.selectedAmenityKeys().has(key);
  }

  protected toggleAmenity(key: string): void {
    this.selectedAmenityKeys.update((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  protected adjustQuantity(delta: number): void {
    const control = this.form.controls.quantity;
    const current = control.value ?? 1;
    control.setValue(Math.max(1, current + delta));
  }

  protected clampQuantity(): void {
    const control = this.form.controls.quantity;
    const value = control.value;
    if (value == null || Number.isNaN(value) || value < 1) {
      control.setValue(1);
    }
  }

  private applyAmenitiesFromRoom(amenities: RoomAmenity[]): void {
    const selected = new Set<string>();
    const others: string[] = [];

    for (const amenity of amenities) {
      const predefined = findPredefinedAmenity(amenity.key, amenity.name);
      if (predefined) {
        selected.add(predefined.key);
      } else if (amenity.name.trim()) {
        others.push(amenity.name.trim());
      }
    }

    this.selectedAmenityKeys.set(selected);
    this.form.patchValue({
      showOtherAmenities: others.length > 0,
      otherAmenitiesText: others.join(', '),
    });
  }

  private buildAmenitiesPayload(): RoomAmenity[] {
    const raw = this.form.getRawValue();
    const predefined = PREDEFINED_ROOM_AMENITIES.filter((amenity) =>
      this.selectedAmenityKeys().has(amenity.key),
    ).map((amenity) => ({
      key: amenity.key,
      name: amenity.name,
      icon: amenity.icon,
      iconType: 'custom',
    }));

    const custom = raw.showOtherAmenities
      ? raw.otherAmenitiesText
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
          .map((name) => ({
            key: slugify(name),
            name,
            icon: slugify(name),
            iconType: 'custom',
          }))
      : [];

    return [...predefined, ...custom];
  }

  private syncPriceSymbol(code: string): void {
    this.priceSymbol.set(currencyDisplaySymbol(code));
  }

  save(): void {
    if (this.form.invalid || this.uploading()) return;

    this.saving.set(true);
    this.error.set(null);

    const raw = this.form.getRawValue();
    const title = raw.title.trim();
    const amenities = this.buildAmenitiesPayload();

    const base: RoomCreatePayload | RoomUpdatePayload = {
      title,
      type: raw.type.trim(),
      description: raw.description,
      price: raw.price,
      currency: normalizeCurrencyCode(raw.currency),
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

function normalizeUnit(unit?: string): string {
  const value = (unit ?? '').trim().toLowerCase().replace(/\./g, '');
  if (value === 'sqm' || value === 'sq m' || value === 'square meter' || value === 'square meters') {
    return 'sq m';
  }
  return 'sq ft';
}
