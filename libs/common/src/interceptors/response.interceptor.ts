/**
 * =============================================================================
 * RESPONSE INTERCEPTOR
 * =============================================================================
 *
 * Standardizes all API responses into a consistent format.
 *
 * WITHOUT THIS INTERCEPTOR:
 * ------------------------
 * GET /api/overview → { totalSessions: 100, totalUsers: 80 }
 *
 * WITH THIS INTERCEPTOR:
 * ---------------------
 * GET /api/overview → {
 *   status: "success",
 *   data: { totalSessions: 100, totalUsers: 80 },
 *   timestamp: "2024-01-15T10:30:00.000Z"
 * }
 *
 * WHY STANDARDIZE RESPONSES?
 * -------------------------
 * - Consistency: Frontend always knows what to expect
 * - Debugging: Timestamp helps trace issues
 * - Status: Easy to check if request succeeded
 * - Extensibility: Add metadata without breaking clients
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

/**
 * Standard API response wrapper.
 * All successful responses follow this shape.
 */
export interface ApiResponse<T> {
  /** Always "success" for non-error responses */
  status: "success";
  /** The actual response data */
  data: T;
  /** ISO timestamp of when response was generated */
  timestamp: string;
}

/**
 * Response interceptor that wraps all responses.
 *
 * GENERIC TYPE <T>:
 * ----------------
 * T represents the type returned by the handler.
 * ApiResponse<T> wraps it in our standard format.
 *
 * IMPLEMENTS NestInterceptor:
 * --------------------------
 * All interceptors must implement NestInterceptor interface.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  /**
   * Intercept and transform the response.
   *
   * PARAMETERS:
   * ----------
   * - context: Access to request/response and metadata
   * - next: The handler chain (call next.handle() to proceed)
   *
   * RXJS OBSERVABLE:
   * ---------------
   * next.handle() returns an Observable of the response.
   * We use .pipe() to transform it before sending to client.
   *
   * @param context - Execution context
   * @param next - Call handler
   * @returns Observable of transformed response
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    // Call the handler and transform the response
    return next.handle().pipe(
      // map() transforms each value in the stream
      map((data) => ({
        status: "success" as const,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
