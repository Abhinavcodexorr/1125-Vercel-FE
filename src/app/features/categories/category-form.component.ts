import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CategoryForm } from '../../core/models/category.model';
import { DataService } from '../../core/services/data.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [PageHeaderComponent, ReactiveFormsModule, RouterLink],
  template: `
    <app-page-header
      [title]="isEdit ? 'Edit category' : 'Add category'"
      subtitle="Create accommodation types — Deluxe, Standard Room, Chalets."
    />

    <div class="form-card card">
      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="form-group">
          <label>Name *</label>
          <input formControlName="name" placeholder="e.g. 5 Bedroom Deluxe" />
        </div>
        <div class="form-group">
          <label>Slug</label>
          <input formControlName="slug" placeholder="auto-generated if empty" />
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea formControlName="description" placeholder="Short description for listings"></textarea>
        </div>
        <div class="form-group checkbox-row">
          <label>
            <input type="checkbox" formControlName="isActive" />
            isActive — visible on public site
          </label>
        </div>

        <div class="form-actions">
          <a routerLink="/categories" class="btn btn-ghost">Cancel</a>
          <button type="submit" class="btn btn-primary" [disabled]="form.invalid">
            {{ isEdit ? 'Update' : 'Create' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: `
    .form-card {
      max-width: 560px;
      padding: 1.5rem;
    }

    .checkbox-row label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;
      cursor: pointer;
    }

    .checkbox-row input {
      width: auto;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.625rem;
      margin-top: 1.5rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--border-light);
    }
  `,
})
export class CategoryFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly data = inject(DataService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected isEdit = false;
  private categoryId = '';

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    slug: [''],
    description: [''],
    isActive: [true],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const cat = this.data.getCategoryById(id);
      if (!cat) {
        this.router.navigate(['/categories']);
        return;
      }
      this.isEdit = true;
      this.categoryId = id;
      this.form.patchValue(cat);
    }
  }

  save(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue() as CategoryForm;
    if (this.isEdit) {
      this.data.updateCategory(this.categoryId, value);
    } else {
      this.data.addCategory(value);
    }
    this.router.navigate(['/categories']);
  }
}
