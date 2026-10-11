import { Injectable, inject } from '@angular/core';
import { ZardSonnerService } from '@/shared/components/sonner/sonner.service';

/**
 * The one place the app talks to the toast system. Everything else calls
 * `alertSuccess` / `alertError` here, so swapping the underlying toast
 * library never touches feature code.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly sonner = inject(ZardSonnerService);

  alertSuccess(message: string, description?: string): void {
    this.sonner.success(message, description ? { description } : undefined);
  }

  alertError(message: string, description?: string): void {
    this.sonner.error(message, description ? { description } : undefined);
  }

  alertInfo(message: string, description?: string): void {
    this.sonner.info(message, description ? { description } : undefined);
  }
}
