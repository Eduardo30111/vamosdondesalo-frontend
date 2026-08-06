import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Error interno del servidor';
    let errorType = 'SERVER_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;
        if (Array.isArray(resObj.message)) {
          message = resObj.message.join('. ');
        } else {
          message = resObj.message || resObj.error || exception.message;
        }
      }
      errorType = 'HTTP_EXCEPTION';
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = HttpStatus.BAD_REQUEST;
      errorType = 'DATABASE_ERROR';

      switch (exception.code) {
        case 'P1001':
          status = HttpStatus.SERVICE_UNAVAILABLE;
          message = 'No se pudo conectar con el servidor de base de datos. Por favor reintenta en unos instantes.';
          break;
        case 'P1002':
        case 'P1008':
          status = HttpStatus.GATEWAY_TIMEOUT;
          message = 'Tiempo de espera agotado al comunicar con la base de datos.';
          break;
        case 'P2002': {
          const target = (exception.meta?.target as string[]) || [];
          message = `Ya existe un registro con el mismo ${target.join(', ') || 'valor único'}.`;
          break;
        }
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'El registro solicitado no existe o fue eliminado.';
          break;
        default:
          message = `Error en base de datos (${exception.code}). Por favor intenta nuevamente.`;
          break;
      }
      this.logger.error(`Prisma Known Error [${exception.code}]: ${exception.message}`);
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      errorType = 'DATABASE_CONNECTION_ERROR';
      message = 'No se pudo iniciar la conexión con la base de datos. El servicio se está reiniciando.';
      this.logger.error(`Prisma Init Error: ${exception.message}`);
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      errorType = 'VALIDATION_ERROR';
      message = 'Los datos proporcionados no tienen el formato correcto.';
      this.logger.error(`Prisma Validation Error: ${exception.message}`);
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled Exception at ${request.method} ${request.url}: ${exception.message}`, exception.stack);
      message = exception.message || 'Error inesperado del servidor';
    }

    if (!response.headersSent) {
      response.status(status).json({
        statusCode: status,
        message,
        errorType,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }
}
