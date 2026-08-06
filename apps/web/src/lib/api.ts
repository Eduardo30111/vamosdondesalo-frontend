import { AppError, formatErrorMessage } from './error-handler';

const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor;
const API_URL = isCapacitor
  ? 'https://salo-api.onrender.com'
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number = 25000; // 25 segundos

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  private createTimeoutSignal(timeoutMs: number, customSignal?: AbortSignal | null): { signal: AbortSignal; cleanup: () => void } {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort(new DOMException('Tiempo de espera agotado en la petición', 'AbortError'));
    }, timeoutMs);

    let removeCustomListener = () => {};
    if (customSignal) {
      if (customSignal.aborted) {
        controller.abort(customSignal.reason);
      } else {
        const onCustomAbort = () => controller.abort(customSignal.reason);
        customSignal.addEventListener('abort', onCustomAbort);
        removeCustomListener = () => customSignal.removeEventListener('abort', onCustomAbort);
      }
    }

    return {
      signal: controller.signal,
      cleanup: () => {
        clearTimeout(timer);
        removeCustomListener();
      },
    };
  }

  private async handleFetchException(err: unknown, status?: number): Promise<never> {
    const isOffline = typeof window !== 'undefined' && typeof navigator !== 'undefined' && !navigator.onLine;
    const isTimeout =
      (err instanceof DOMException && err.name === 'AbortError') ||
      (err instanceof Error && err.message.toLowerCase().includes('timeout'));

    const rawMsg = err instanceof Error ? err.message : String(err);
    const friendlyMessage = formatErrorMessage(err);

    throw new AppError(friendlyMessage, {
      status,
      isNetwork: isOffline || !status,
      isTimeout,
      isDatabase: rawMsg.toLowerCase().includes('database') || rawMsg.toLowerCase().includes('prisma'),
    });
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const timeoutMs = options.timeoutMs || this.defaultTimeout;
    const { signal, cleanup } = this.createTimeoutSignal(timeoutMs, options.signal);

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers,
        signal,
      });
    } catch (err: unknown) {
      cleanup();
      return this.handleFetchException(err);
    }

    cleanup();

    if (!res.ok) {
      let serverErrorMsg = '';
      try {
        const errorJson = await res.json();
        serverErrorMsg = errorJson?.message || errorJson?.error || '';
        if (Array.isArray(serverErrorMsg)) {
          serverErrorMsg = serverErrorMsg.join(', ');
        }
      } catch {
        serverErrorMsg = '';
      }

      const formatted = formatErrorMessage(
        serverErrorMsg || `Error ${res.status}`,
        res.status >= 500 ? 'El servidor no pudo procesar la solicitud' : 'Error en la solicitud'
      );

      throw new AppError(formatted, {
        status: res.status,
        isNetwork: res.status === 502 || res.status === 503 || res.status === 504,
        isDatabase: serverErrorMsg.toLowerCase().includes('database') || serverErrorMsg.toLowerCase().includes('prisma'),
      });
    }

    return res.json();
  }

  async upload<T>(path: string, formData: FormData, options: RequestOptions = {}) {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const timeoutMs = options.timeoutMs || 45000; // 45 segundos para subida de archivos
    const { signal, cleanup } = this.createTimeoutSignal(timeoutMs, options.signal);

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        body: formData,
        headers,
        signal,
      });
    } catch (err: unknown) {
      cleanup();
      return this.handleFetchException(err);
    }

    cleanup();

    if (!res.ok) {
      let serverErrorMsg = '';
      try {
        const errorJson = await res.json();
        serverErrorMsg = errorJson?.message || errorJson?.error || '';
      } catch {
        serverErrorMsg = '';
      }

      const formatted = formatErrorMessage(serverErrorMsg || `Error ${res.status}`);
      throw new AppError(formatted, {
        status: res.status,
        isNetwork: res.status >= 502 && res.status <= 504,
      });
    }

    return res.json() as Promise<T>;
  }

  get<T>(path: string, options?: RequestOptions) {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  post<T>(path: string, data?: unknown, options?: RequestOptions) {
    return this.request<T>(path, { ...options, method: 'POST', body: JSON.stringify(data) });
  }

  put<T>(path: string, data?: unknown, options?: RequestOptions) {
    return this.request<T>(path, { ...options, method: 'PUT', body: JSON.stringify(data) });
  }

  delete<T>(path: string, options?: RequestOptions) {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient(API_URL);
