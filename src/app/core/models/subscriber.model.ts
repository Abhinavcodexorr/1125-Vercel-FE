export interface Subscriber {
  id: string;
  email: string;
  source?: string;
  subscribedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubscriberListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SubscriberListResult extends SubscriberListMeta {
  subscribers: Subscriber[];
}

export interface SubscriberQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ApiSubscriberDocument {
  _id?: string;
  id?: string;
  email?: string;
  source?: string;
  subscribedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function mapApiSubscriber(doc: ApiSubscriberDocument): Subscriber {
  return {
    id: doc.id ?? doc._id ?? '',
    email: doc.email ?? '',
    source: doc.source,
    subscribedAt: doc.subscribedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function mapSubscriberListResponse(body: unknown): SubscriberListResult {
  const record = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const data = record['data'];
  const list = Array.isArray(data) ? (data as ApiSubscriberDocument[]) : [];

  return {
    subscribers: list.map(mapApiSubscriber),
    total: Number(record['total'] ?? list.length),
    page: Number(record['page'] ?? 1),
    limit: Number(record['limit'] ?? (list.length || 20)),
    totalPages: Number(record['totalPages'] ?? 1),
  };
}
