const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor;
const API_URL = isCapacitor
  ? 'https://salo-api.onrender.com'
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Error del servidor' }));
      throw new Error(error.message || `Error ${res.status}`);
    }

    return res.json();
  }

  async upload<T>(path: string, formData: FormData) {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      body: formData,
      headers,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Error del servidor' }));
      throw new Error(error.message || `Error ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  get<T>(path: string) {
    return this.request<T>(path);
  }

  post<T>(path: string, data?: unknown) {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(data) });
  }

  put<T>(path: string, data?: unknown) {
    return this.request<T>(path, { method: 'PUT', body: JSON.stringify(data) });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

export const api = new ApiClient(API_URL);
