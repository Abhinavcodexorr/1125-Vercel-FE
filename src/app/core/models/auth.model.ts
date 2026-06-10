export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role?: string;
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
    return {
      id: user.id ?? '',
      email: user.email ?? email,
      name: user.name ?? email.split('@')[0],
      role: user.role ?? 'SuperAdmin',
    };
  }

  return {
    id: '',
    email,
    name: email.split('@')[0],
    role: 'SuperAdmin',
  };
}
