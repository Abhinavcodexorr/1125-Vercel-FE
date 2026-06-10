export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
}

export type CategoryForm = Pick<Category, 'name' | 'slug' | 'description' | 'isActive'>;
