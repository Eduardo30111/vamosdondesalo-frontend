export class AppError extends Error {
  public status?: number;
  public code?: string;
  public isNetwork: boolean;
  public isTimeout: boolean;
  public isDatabase: boolean;

  constructor(
    message: string,
    options?: {
      status?: number;
      code?: string;
      isNetwork?: boolean;
      isTimeout?: boolean;
      isDatabase?: boolean;
    }
  ) {
    super(message);
    this.name = 'AppError';
    this.status = options?.status;
    this.code = options?.code;
    this.isNetwork = options?.isNetwork ?? false;
    this.isTimeout = options?.isTimeout ?? false;
    this.isDatabase = options?.isDatabase ?? false;
  }
}

/**
 * Traduce cualquier error técnico, de red, servidor o base de datos a un mensaje
 * claro, distintivo y comprensible para el usuario final en español.
 */
export function formatErrorMessage(err: unknown, fallbackMessage = 'Ha ocurrido un error inesperado'): string {
  if (!err) return fallbackMessage;

  // Si ya es un AppError con mensaje procesado
  if (err instanceof AppError && err.message) {
    return err.message;
  }

  const rawMsg = (err instanceof Error ? err.message : String(err)) || '';
  const lower = rawMsg.toLowerCase();

  // 1. Detección de estado Offline explícito en el navegador
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'Sin conexión a internet. Revisa tu red Wi-Fi o datos móviles.';
  }

  // 2. Detección de Timeout / Abort
  if (
    lower.includes('aborted') ||
    lower.includes('timeout') ||
    lower.includes('tiempo de espera') ||
    (err instanceof DOMException && err.name === 'AbortError')
  ) {
    return 'Tiempo de espera agotado. La conexión es muy lenta o inestable.';
  }

  // 3. Detección de fallo de conexión de bajo nivel (Failed to fetch, NetworkError, etc.)
  if (
    lower.includes('failed to fetch') ||
    lower.includes('network error') ||
    lower.includes('load failed') ||
    lower.includes('fetch failed') ||
    lower.includes('the network connection was lost') ||
    lower.includes('net::err_') ||
    lower.includes('connection refused')
  ) {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && !navigator.onLine) {
      return 'Sin conexión a internet. Revisa tu conexión.';
    }
    return 'No se pudo conectar con el servidor. El servidor se está iniciando o la conexión es inestable.';
  }

  // 4. Errores de Gateway / Servidor Render durmiendo (502, 503, 504)
  if (lower.includes('502') || lower.includes('bad gateway')) {
    return 'El servidor se está iniciando (Error 502). Espera unos segundos y vuelve a intentar.';
  }
  if (lower.includes('503') || lower.includes('service unavailable')) {
    return 'Servicio temporalmente no disponible (Error 503). Por favor reintenta en unos instantes.';
  }
  if (lower.includes('504') || lower.includes('gateway timeout')) {
    return 'El servidor tardó demasiado en responder (Error 504). Revisa tu conexión y reintenta.';
  }

  // 5. Errores de Base de Datos
  if (
    lower.includes('prisma') ||
    lower.includes('p1001') ||
    lower.includes('p1002') ||
    lower.includes('cant reach database') ||
    lower.includes("can't reach database") ||
    lower.includes('database server') ||
    lower.includes('base de datos') ||
    lower.includes('db_error')
  ) {
    return 'Error al comunicar con la base de datos. No se pudieron cargar o guardar los datos.';
  }

  // 6. Autenticación y Permisos
  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('token expired') || lower.includes('jwt expired')) {
    return 'Tu sesión ha expirado o no es válida. Por favor inicia sesión nuevamente.';
  }
  if (lower.includes('403') || lower.includes('forbidden')) {
    return rawMsg.length > 15 && !rawMsg.includes('Error 403')
      ? rawMsg
      : 'No tienes permisos para realizar esta acción o tu plan no lo permite.';
  }
  if (lower.includes('404') || lower.includes('not found')) {
    return rawMsg.length > 15 && !rawMsg.includes('Error 404')
      ? rawMsg
      : 'El recurso solicitado no fue encontrado.';
  }

  // 7. Si es un mensaje de error legible y descriptivo devuelto por el backend
  if (rawMsg && rawMsg !== 'Error del servidor' && !rawMsg.startsWith('Error ')) {
    return rawMsg;
  }

  return fallbackMessage;
}

/**
 * Determina si el error corresponde a una falla de red, timeout o caída de servidor
 * para activar la cola offline o reintentos automáticos.
 */
export function isNetworkOrServerError(err: unknown): boolean {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && !navigator.onLine) {
    return true;
  }
  if (err instanceof AppError) {
    return err.isNetwork || err.isTimeout;
  }
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('sin conexión') ||
    msg.includes('no se pudo conectar') ||
    msg.includes('tiempo de espera') ||
    msg.includes('network error') ||
    msg.includes('load failed') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('504')
  );
}
