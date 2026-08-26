export interface AdminUser {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  role?: string;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
  isBlocked?: boolean;
  hasLoggedIn?: boolean;
  hasActiveSession?: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponseBody {
  success?: boolean;
  message?: string;
  token?: string;
  accessToken?: string;
  access_token?: string;
  user?: Partial<AdminUser> & { id?: string; role?: string };
  data?: {
    token?: string;
    accessToken?: string;
    access_token?: string;
    expiresIn?: string;
    user?: Partial<AdminUser> & { id?: string; role?: string; lastLogin?: string };
  };
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface SubAdminCreatePayload {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: 'SubAdmin' | 'Manager';
}

export interface SubAdminUpdatePayload {
  email?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  role?: 'SubAdmin' | 'Manager';
}

export interface SubAdmin extends AdminUser {
  isActive?: boolean;
  isBlocked?: boolean;
  hasLoggedIn?: boolean;
  hasActiveSession?: boolean;
}

export function extractToken(body: LoginResponseBody): string | null {
  return (
    body.token ??
    body.accessToken ??
    body.access_token ??
    body.data?.token ??
    body.data?.accessToken ??
    body.data?.access_token ??
    null
  );
}

export function extractUser(body: LoginResponseBody, email: string): AdminUser {
  const user = body.user ?? body.data?.user;
  if (user) {
    return mapAdminUser(user, email);
  }

  return {
    id: '',
    email,
    name: email.split('@')[0],
    role: 'SuperAdmin',
  };
}

export function mapAdminUser(
  doc: Partial<AdminUser> & {
    _id?: string;
    id?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    last_login?: string | null;
    lastLogin?: string | null;
    created_at?: string;
    hasLoggedIn?: boolean;
    hasActiveSession?: boolean;
    isActive?: boolean;
  },
  fallbackEmail = '',
): AdminUser {
  const email = doc.email ?? fallbackEmail;
  const nameFromParts = [doc.firstName, doc.lastName].filter((part) => part?.trim()).join(' ').trim();
  const fullName = doc.fullName?.trim();
  const lastLogin = doc.lastLogin || doc.last_login || undefined;

  return {
    id: String(doc.id ?? doc._id ?? ''),
    email,
    name: fullName || nameFromParts || email || 'Admin',
    firstName: doc.firstName?.trim() || undefined,
    lastName: doc.lastName?.trim() || undefined,
    fullName,
    role: doc.role ?? 'SubAdmin',
    lastLogin,
    createdAt: doc.createdAt ?? doc.created_at,
    updatedAt: doc.updatedAt,
    isActive: doc.isActive !== false,
    isBlocked: Boolean(doc.isBlocked),
    hasLoggedIn: Boolean(doc.hasLoggedIn) && Boolean(lastLogin),
    hasActiveSession: Boolean(doc.hasActiveSession),
  };
}
