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

/** Set once a hydrate finds no refresh cookie, so we do not re-hit the
 *  session endpoint on every request of an anonymous page load. */
let hydrationExhausted = false;

/** In-flight single-flight hydrate promise shared by parallel requests. */
let hydrationInFlight: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
  if (token) {
    // A fresh credential (login / session issue) re-opens hydration.
    hydrationExhausted = false;
  }
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

/**
 * Single-flight access-token hydration from the HttpOnly refresh cookie.
 *
 * Pages fire several authenticated requests in parallel on load; without a
 * token each one would race into a 401 and trigger its own recovery round.
 * One shared session fetch feeds them all instead.
 *
 * - `force: true` re-issues even when a token is in memory (used after a 401,
 *   because the in-memory token may be expired).
 * - A failed or cookie-less hydrate clears the token so we do not retry a
 *   dead credential on every request.
 */
function hydrateAccessToken(force = false): Promise<string | null> {
  if (hydrationExhausted) {
    return Promise.resolve(null);
  }
  if (!force && inMemoryAccessToken) {
    return Promise.resolve(inMemoryAccessToken);
  }
  if (!hydrationInFlight) {
    hydrationInFlight = (async () => {
      try {
        const sessionUrl = `${API_BASE_URL.replace(/\/$/, "")}/auth/session/`;
        const res = await fetch(sessionUrl, {
          method: "GET",
          headers: { "X-Requested-With": "XMLHttpRequest" },
          credentials: "include",
        });
        if (res.ok) {
          const body = (await res.json()) as { access?: string } | null;
          if (body?.access) {
            setAccessToken(body.access);
            return body.access;
          }
        }
        // No usable refresh cookie — drop any stale in-memory credential.
        setAccessToken(null);
        hydrationExhausted = true;
        return null;
      } catch {
        // Network failure: proceed unauthenticated; callers surface the error.
        return inMemoryAccessToken;
      } finally {
        hydrationInFlight = null;
      }
    })();
  }
  return hydrationInFlight;
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
  tier?: string;
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

export interface PlatformOverviewResponse {
  organizations: {
    total: number;
    active: number;
    pending: number;
  };
  users: {
    total: number;
    verified: number;
  };
  infrastructure: {
    total_branches: number;
    total_api_keys: number;
  };
  system: {
    version: string;
    environment: string;
    database_ok: boolean;
    redis_ok: boolean;
  };
}

export interface PlatformOrgItem {
  id: string;
  name: string;
  slug: string;
  legal_name: string;
  base_currency: string;
  fleet_size_band: string;
  verification_status: string;
  is_active: boolean;
  created_at: string;
  members_count: number;
  branches_count: number;
}

export interface PlatformAuditLogItem {
  id: string;
  organization_id: string | null;
  actor_email: string | null;
  action: string;
  object_type: string;
  object_id: string;
  created_at: string;
  ip: string | null;
}

export interface PlatformSystemHealthResponse {
  database: {
    connected: boolean;
    engine: string;
    postgis_version: string | null;
    latency_ms: number;
  };
  cache: {
    connected: boolean;
    backend: string;
  };
}

export interface BranchItem {
  id: string;
  name: string;
  type: string;
  status: string;
  is_primary: boolean;
  address: string;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
  revoked: boolean;
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

  // Pre-flight hydration: a full page load starts with an empty in-memory
  // token, so parallel data fetches would otherwise all race into 401s.
  // Auth endpoints are excluded (login/session must work without a token).
  if (!headers.has("Authorization") && !path.includes("/auth/")) {
    await hydrateAccessToken();
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

  if (response.status === 401 && !path.includes("/auth/")) {
    // Token may be expired — force a fresh hydrate from the refresh cookie.
    try {
      const token = await hydrateAccessToken(true);
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
        const retryRes = await fetch(url, { ...options, headers, credentials: "include" });
        if (retryRes.status === 204) return null as unknown as T;
        if (retryRes.ok) {
          return (await retryRes.json()) as T;
        }
      }
    } catch {
      // Fall through to error handling
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

export const organizationApi = {
  async getMine(): Promise<{ results: MembershipItem[] }> {
    return api.get<{ results: MembershipItem[] }>("/organizations/mine/");
  },

  async getCurrent(): Promise<OrgProfile> {
    return api.get<OrgProfile>("/organizations/current/");
  },

  async getBranches(): Promise<{ count: number; results: BranchItem[] }> {
    return api.get<{ count: number; results: BranchItem[] }>("/organizations/current/branches/");
  },

  async getMembers(page = 1): Promise<PaginatedResponse<any>> {
    return api.get<PaginatedResponse<any>>(`/organizations/current/members/?page=${page}`);
  },

  async getApiKeys(): Promise<{ results: ApiKeyItem[] }> {
    return api.get<{ results: ApiKeyItem[] }>("/organizations/current/api-keys/");
  },

  async getSettings(): Promise<Record<string, unknown>> {
    return api.get<Record<string, unknown>>("/organizations/current/settings/");
  },

  async updateSettings(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return api.patch<Record<string, unknown>>("/organizations/current/settings/", data);
  },
};

export const platformApi = {
  async getOverview(): Promise<PlatformOverviewResponse> {
    return api.get<PlatformOverviewResponse>("/platform/overview/");
  },

  async getOrganizations(page = 1): Promise<PaginatedResponse<PlatformOrgItem>> {
    return api.get<PaginatedResponse<PlatformOrgItem>>(`/platform/organizations/?page=${page}`);
  },

  async updateOrganization(
    id: string,
    data: { is_active?: boolean; verification_status?: string }
  ): Promise<{ id: string; name: string; is_active: boolean; verification_status: string }> {
    return api.patch<{ id: string; name: string; is_active: boolean; verification_status: string }>(
      `/platform/organizations/${id}/`,
      data
    );
  },

  async getAuditLogs(page = 1): Promise<PaginatedResponse<PlatformAuditLogItem>> {
    return api.get<PaginatedResponse<PlatformAuditLogItem>>(`/platform/audit-logs/?page=${page}`);
  },

  async getSystemHealth(): Promise<PlatformSystemHealthResponse> {
    return api.get<PlatformSystemHealthResponse>("/platform/system-health/");
  },
};
