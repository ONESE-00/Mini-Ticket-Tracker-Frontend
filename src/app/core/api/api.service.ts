import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, tap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ToastService } from '../notifications/toast.service';
import type { ApiError } from './api.types';

/** Options for the shared response operator. */
interface HandleResponseOptions {
  /** Show a success toast on a successful emission. Writes true, reads false. */
  showSuccess?: boolean;
  /** Override the success toast text (otherwise taken from the response body). */
  successMessage?: string;
  /** Override the error toast text (otherwise derived from the error). */
  errorMessage?: string;
  /** Suppress the error toast (the typed ApiError is still rethrown). */
  silentError?: boolean;
}

/**
 * Thin HTTP layer. Every request pipes through `handleResponse`, which owns
 * toast notifications and the HttpErrorResponse -> ApiError mapping so that
 * feature code never touches HttpClient or the toast system directly.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly api_url = environment.apiBaseUrl;

  // ---------------------------------------------------------------- helpers

  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>, options?: HandleResponseOptions) {
    return this.http
      .get<T>(`${this.api_url}${path}`, { params: this.toHttpParams(params) })
      .pipe(this.handleResponse<T>({ showSuccess: false, ...options }));
  }

  post<T>(path: string, body: unknown, options?: HandleResponseOptions) {
    return this.http.post<T>(`${this.api_url}${path}`, body).pipe(this.handleResponse<T>({ showSuccess: true, ...options }));
  }

  patch<T>(path: string, body: unknown, options?: HandleResponseOptions) {
    return this.http.patch<T>(`${this.api_url}${path}`, body).pipe(this.handleResponse<T>({ showSuccess: true, ...options }));
  }

  put<T>(path: string, body: unknown, options?: HandleResponseOptions) {
    return this.http.put<T>(`${this.api_url}${path}`, body).pipe(this.handleResponse<T>({ showSuccess: true, ...options }));
  }

  delete<T>(path: string, options?: HandleResponseOptions) {
    return this.http.delete<T>(`${this.api_url}${path}`).pipe(this.handleResponse<T>({ showSuccess: true, ...options }));
  }

  // ------------------------------------------------------- response operator

  /**
   * Shared RxJS operator factory. On success it optionally shows a success
   * toast; on error it maps the HttpErrorResponse into the typed `ApiError`
   * shape, shows an error toast (unless silenced) and rethrows the ApiError so
   * components can still react (e.g. place `fieldErrors` onto form controls).
   */
  handleResponse<T>({ showSuccess = true, successMessage, errorMessage, silentError = false }: HandleResponseOptions = {}) {
    return (source$: Observable<T>): Observable<T> =>
      source$.pipe(
        tap((response: T) => {
          if (showSuccess && response) {
            const fromBody = (response as { message?: string; result?: { message?: string } })?.message ?? (response as { result?: { message?: string } })?.result?.message;
            const successMsg = successMessage ?? fromBody ?? 'Success';
            this.toast.alertSuccess(successMsg);
          }
        }),
        catchError((error: HttpErrorResponse) => {
          const apiError = this.toApiError(error, errorMessage);
          if (!silentError) {
            this.toast.alertError(apiError.message);
          }
          console.warn('API error:', apiError);
          return throwError(() => apiError);
        }),
      );
  }

  // --------------------------------------------------------------- internals

  /** Map an HttpErrorResponse into the normalised ApiError the app reacts to. */
  private toApiError(error: HttpErrorResponse, override?: string): ApiError {
    const body = error?.error as Partial<ApiError> | undefined;

    // Network / CORS / server unreachable: status 0.
    if (error.status === 0) {
      return {
        status: 0,
        error: 'NetworkError',
        message: override ?? 'Network error. Check your connection and try again.',
      };
    }

    const message = override ?? body?.message ?? this.defaultMessageFor(error.status) ?? error.message ?? 'Something went wrong';

    return {
      status: error.status,
      error: body?.error ?? error.statusText ?? 'Error',
      message,
      fieldErrors: body?.fieldErrors,
    };
  }

  private defaultMessageFor(status: number): string | undefined {
    switch (status) {
      case 400:
        return 'Please check the form and try again.';
      case 401:
        return 'Your session has expired. Please sign in again.';
      case 403:
        return "You don't have permission to do that.";
      case 404:
        return 'We couldn’t find what you were looking for.';
      case 409:
        return 'That change conflicts with the current state.';
      case 422:
        return 'Please check the form and try again.';
      default:
        return status >= 500 ? 'The server had a problem. Please try again shortly.' : undefined;
    }
  }

  /** Drop undefined params and coerce to HttpParams. */
  private toHttpParams(params?: Record<string, string | number | boolean | undefined>): HttpParams {
    let httpParams = new HttpParams();
    if (!params) {
      return httpParams;
    }
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    }
    return httpParams;
  }
}
