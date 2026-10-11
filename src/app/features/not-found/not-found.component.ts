import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ZardButtonComponent } from '@/shared/components/button/button.component';

@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ZardButtonComponent],
  template: `
    <div class="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <p class="text-5xl font-semibold text-muted-foreground">404</p>
      <h1 class="text-xl font-semibold">Page not found</h1>
      <p class="max-w-sm text-sm text-muted-foreground">The page you’re looking for doesn’t exist or has moved.</p>
      <a z-button routerLink="/tickets">Back to tickets</a>
    </div>
  `,
})
export default class NotFoundComponent {}
