export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role?: string;
  lastLogin?: string;
  createdAt?: string;
  isBlocked?: boolean;
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
  name?: string;
}

export interface SubAdminUpdatePayload {
  email?: string;
  name?: string;
  password?: string;
}

export interface SubAdmin extends AdminUser {
  isBlocked?: boolean;
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
  doc: Partial<AdminUser> & { _id?: string; id?: string },
  fallbackEmail = '',
): AdminUser {
  const email = doc.email ?? fallbackEmail;
  return {
    id: doc.id ?? doc._id ?? '',
    email,
    name: doc.name?.trim() || email.split('@')[0] || 'Admin',
    role: doc.role ?? 'SubAdmin',
    lastLogin: doc.lastLogin,
    createdAt: doc.createdAt,
    isBlocked: doc.isBlocked,
  };
}
