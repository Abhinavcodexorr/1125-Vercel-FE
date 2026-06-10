export type GallerySection = 'outdoor' | 'deck_events' | 'interior' | 'pool_beach';

export interface GalleryImage {
  id: string;
  categoryId: string;
  section: GallerySection;
  url: string;
  caption: string;
  sortOrder: number;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
}

export type GalleryForm = Pick<
  GalleryImage,
  'categoryId' | 'section' | 'url' | 'caption' | 'isActive'
>;

export const GALLERY_SECTIONS: { value: GallerySection; label: string }[] = [
  { value: 'outdoor', label: 'Outdoor & Pergola' },
  { value: 'deck_events', label: 'Deck & Events' },
  { value: 'interior', label: 'Interior' },
  { value: 'pool_beach', label: 'Pool & Beach' },
];
