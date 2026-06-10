export interface StatusFields {
  isActive: boolean;
  isDeleted: boolean;
}

export type ItemStatus = 'active' | 'inactive' | 'deleted';

export function itemStatus(item: StatusFields): ItemStatus {
  if (item.isDeleted) return 'deleted';
  if (item.isActive) return 'active';
  return 'inactive';
}

export function statusLabel(status: ItemStatus): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'inactive':
      return 'Inactive';
    case 'deleted':
      return 'Deleted';
  }
}
