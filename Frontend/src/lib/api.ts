/**
 * Centralized API client for Logistimus backend REST API (/api/v1/).
 *
 * Implements:
 * - In-memory access token storage (CSRF + token theft mitigation).
 * - Automatic CSRF header `X-Requested-With: XMLHttpRequest` on mutating requests.
 * - Automatic `credentials: "include"` for HttpOnly refresh cookie exchange.
 * - Standardized error envelope parsing ({ error: { code, message, details, request_id } }).
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: Record<string, unknown> | null;
  request_id?: string;
  status: number;
}

export class ApiError extends Error {
  code: string;
  details?: Record<string, unknown> | null;
  requestId?: string;
  status: number;

  constructor(payload: ApiErrorDetail) {
    super(payload.message);
    this.name = "ApiError";
    this.code = payload.code;
    this.details = payload.details;
    this.requestId = payload.request_id;
    this.status = payload.status;
  }
}

let inMemoryAccessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string | null;
  platform_role: string | null;
  email_verified_at: string | null;
}

export interface OrgProfile {
  id: string;
  name: string;
  slug: string;
  base_currency: string;
}

export interface MembershipItem {
  organization_id: string;
  organization_name: string;
  role: string;
  is_current: boolean;
}

export interface AuthResponse {
  access: string;
  expires_in: number;
  user: UserProfile;
  organization: OrgProfile;
  memberships: MembershipItem[];
}

export interface SessionResponse {
  user: UserProfile;
  organization: OrgProfile;
  memberships: MembershipItem[];
  access?: string | null;
  expires_in?: number | null;
}

export interface RegisterRequest {
  companyName: string;
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
  acceptTerms?: boolean;
}

export interface RegisterResponse {
  verification_required: boolean;
  email: string;
  cooldown_seconds: number;
}

export interface VerifyEmailResponse {
  verified: boolean;
  joined_organizations: string[];
}

export interface LoginHistoryItem {
  id: string;
  ip: string | null;
  user_agent: string | null;
  successful: boolean;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  page: number;
  page_size: number;
  pages: number;
  results: T[];
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith("http")
    ? path
    : `${API_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  // Required by Logistimus backend CSRF policy (SECURITY_PLAN §1)
  if (!headers.has("X-Requested-With")) {
    headers.set("X-Requested-With", "XMLHttpRequest");
  }

  if (inMemoryAccessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${inMemoryAccessToken}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // Transmit and receive HttpOnly refresh cookie
  });

  if (response.status === 204) {
    return null as unknown as T;
  }

  let data: any = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const errorBody = data?.error || {};
    throw new ApiError({
      code: errorBody.code || "unknown_error",
      message: errorBody.message || response.statusText || "An unexpected error occurred.",
      details: errorBody.details || null,
      request_id: errorBody.request_id || response.headers.get("x-request-id") || undefined,
      status: response.status,
    });
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { ...options, method: "DELETE" }),
};

export const authApi = {
  async register(payload: RegisterRequest): Promise<RegisterResponse> {
    return api.post<RegisterResponse>("/auth/register/", payload);
  },

  async verifyEmail(email: string, code: string): Promise<VerifyEmailResponse> {
    return api.post<VerifyEmailResponse>("/auth/verify-email/", { email, code });
  },

  async resendVerification(email: string): Promise<{ cooldown_seconds: number }> {
    return api.post<{ cooldown_seconds: number }>("/auth/resend-verification/", { email });
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/auth/login/", { email, password });
    if (response?.access) {
      setAccessToken(response.access);
    }
    return response;
  },

  async refresh(): Promise<{ access: string; expires_in: number }> {
    const response = await api.post<{ access: string; expires_in: number }>("/auth/refresh/");
    if (response?.access) {
      setAccessToken(response.access);
    }
    return response;
  },

  async logout(): Promise<void> {
    try {
      await api.post<void>("/auth/logout/");
    } finally {
      setAccessToken(null);
    }
  },

  async session(): Promise<SessionResponse> {
    const response = await api.get<SessionResponse>("/auth/session/");
    if (response?.access) {
      setAccessToken(response.access);
    }
    return response;
  },

  async switchOrganization(organizationId: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/auth/switch-organization/", {
      organization_id: organizationId,
    });
    if (response?.access) {
      setAccessToken(response.access);
    }
    return response;
  },

  async forgotPassword(email: string): Promise<{ cooldown_seconds: number }> {
    return api.post<{ cooldown_seconds: number }>("/auth/forgot-password/", { email });
  },

  async resetPassword(token: string, password: string): Promise<{ reset: boolean; sessions_revoked: number }> {
    return api.post<{ reset: boolean; sessions_revoked: number }>("/auth/reset-password/", {
      token,
      password,
    });
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ changed: boolean }> {
    return api.post<{ changed: boolean }>("/auth/change-password/", {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },

  async getLoginHistory(page = 1): Promise<PaginatedResponse<LoginHistoryItem>> {
    return api.get<PaginatedResponse<LoginHistoryItem>>(`/auth/login-history/?page=${page}`);
  },
};
