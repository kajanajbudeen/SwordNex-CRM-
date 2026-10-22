const API_BASE = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '') + '/api/v1';

export class ApiError extends Error {
  status: number;
  details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export const apiClient = {
  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('sn_token');
    const orgId = localStorage.getItem('sn_org_id');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (orgId) {
      headers['x-organization-id'] = orgId;
    }

    let res: Response;
    try {
      res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });
    } catch (networkError: any) {
      throw new ApiError(
        `Unable to reach backend server at ${API_BASE}. Please ensure backend is running.`,
        0,
        networkError
      );
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      if (res.status === 401 && !endpoint.includes('/auth/login')) {
        // Token expired, clear and redirect to login
        localStorage.removeItem('sn_token');
        localStorage.removeItem('sn_user');
        window.location.href = '/login';
      }
      throw new ApiError(data?.error || data?.message || 'Request failed', res.status, data?.details);
    }

    return data;
  },

  get<T = any>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'GET', headers });
  },

  post<T = any>(endpoint: string, body?: any, headers?: Record<string, string>) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    });
  },

  patch<T = any>(endpoint: string, body?: any, headers?: Record<string, string>) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    });
  },

  put<T = any>(endpoint: string, body?: any, headers?: Record<string, string>) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    });
  },

  delete<T = any>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  },

  async upload<T = any>(endpoint: string, formData: FormData): Promise<T> {
    const token = localStorage.getItem('sn_token');
    const orgId = localStorage.getItem('sn_org_id');

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (orgId) headers['x-organization-id'] = orgId;

    let res: Response;
    try {
      res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
      });
    } catch (networkError: any) {
      throw new ApiError(
        `Unable to reach backend server at ${API_BASE}. Please ensure backend is running.`,
        0,
        networkError
      );
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      if (res.status === 401 && !endpoint.includes('/auth/login')) {
        localStorage.removeItem('sn_token');
        localStorage.removeItem('sn_user');
        window.location.href = '/login';
      }
      throw new ApiError(data?.error || data?.message || 'Upload failed', res.status, data?.details);
    }

    return data;
  },

  async download(endpoint: string, fallbackFilename: string) {
    const token = localStorage.getItem('sn_token');
    const orgId = localStorage.getItem('sn_org_id');

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (orgId) headers['x-organization-id'] = orgId;

    const res = await fetch(`${API_BASE}${endpoint}`, { headers });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || 'Download failed');
    }

    // Read filename from Content-Disposition if present
    const disposition = res.headers.get('content-disposition');
    let filename = fallbackFilename;
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) filename = match[1];
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async downloadPost(endpoint: string, body: any, fallbackFilename: string) {
    const token = localStorage.getItem('sn_token');
    const orgId = localStorage.getItem('sn_org_id');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (orgId) headers['x-organization-id'] = orgId;

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || 'Download failed');
    }

    const disposition = res.headers.get('content-disposition');
    let filename = fallbackFilename;
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) filename = match[1];
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};

