import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
  Optional,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ClsService } from "nestjs-cls";
import { formatTimestampWithTimezone } from "../utils/timezone.util";

interface PrismaError {
  code: string;
  message?: string;
  meta?: Record<string, unknown>;
}

function isPrismaError(exception: unknown): exception is PrismaError {
  return (
    exception !== null &&
    typeof exception === "object" &&
    "code" in exception &&
    typeof (exception as PrismaError).code === "string" &&
    (exception as PrismaError).code.startsWith("P")
  );
}

// Prisma 错误码映射表
const PRISMA_ERROR_MAP: Record<
  string,
  { status: HttpStatus; message: string }
> = {
  P2000: { status: HttpStatus.BAD_REQUEST, message: "Input value too long" },
  P2001: { status: HttpStatus.NOT_FOUND, message: "Record not found" },
  P2002: { status: HttpStatus.CONFLICT, message: "Resource already exists" },
  P2003: {
    status: HttpStatus.BAD_REQUEST,
    message: "Related resource not found",
  },
  P2004: {
    status: HttpStatus.BAD_REQUEST,
    message: "Database constraint violation",
  },
  P2005: { status: HttpStatus.BAD_REQUEST, message: "Invalid field value" },
  P2006: { status: HttpStatus.BAD_REQUEST, message: "Invalid field value" },
  P2011: { status: HttpStatus.BAD_REQUEST, message: "Required field missing" },
  P2021: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: "Database table not found. Please run database migrations.",
  },
  P2012: { status: HttpStatus.BAD_REQUEST, message: "Required field missing" },
  P2025: { status: HttpStatus.NOT_FOUND, message: "Resource not found" },
  P2034: {
    status: HttpStatus.CONFLICT,
    message: "Transaction conflict, please retry",
  },
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(
    @Optional() @Inject(ClsService) private readonly cls?: ClsService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    let error = "Unknown error";

    const errors: Array<{ field: string; message: string; code: string }> = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const rawMessage = (exceptionResponse as Record<string, unknown>).message;

      if (Array.isArray(rawMessage)) {
        message = rawMessage[0] || message;
        error = "Validation Error";
        rawMessage.forEach((msg: string) => {
          const spaceIdx = msg.indexOf(" ");
          const field = spaceIdx > 0 ? msg.substring(0, spaceIdx) : "unknown";
          errors.push({ field, message: msg, code: "VALIDATION_ERROR" });
        });
      } else {
        message =
          typeof rawMessage === "string"
            ? rawMessage
            : (rawMessage as string) || message;
        error =
          typeof exceptionResponse === "string" ? exceptionResponse : message;
      }
    } else if (isPrismaError(exception)) {
      // Handle Prisma errors using mapping table
      const mapping = PRISMA_ERROR_MAP[exception.code];
      if (mapping) {
        status = mapping.status;
        message = mapping.message;
      } else {
        // 未映射的 Prisma 错误码返回通用 500 消息
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = "Internal server error";
      }
      error = "PrismaError";
      // 服务端日志记录原始错误信息（不暴露给客户端）
      this.logger.warn(
        `Prisma error ${exception.code}: ${exception.message}`,
        exception.meta ? JSON.stringify(exception.meta) : undefined,
      );
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    this.logger.error(
      `Exception: ${error} - ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    const requestId =
      this.cls?.get("requestId") ?? `req-${crypto.randomUUID()}`;

    response.status(status).json({
      statusCode: status,
      message,
      error,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: formatTimestampWithTimezone(
        request.headers?.["x-timezone"] as string | undefined,
      ),
      path: request.url,
      requestId,
    });
  }
}
