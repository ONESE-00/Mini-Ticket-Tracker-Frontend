import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideTicket } from '@ng-icons/lucide';

import { ZardSidebarImports } from '@/shared/components/sidebar/sidebar.imports';
import { ZardSonnerComponent } from '@/shared/components/sonner/sonner.component';

/**
 * Application shell: a left sidebar (no top navigation bar) and a content area.
 * The sidebar collapses to an off-canvas drawer on mobile; a single trigger in
 * the slim content header opens it so it stays reachable without a top bar.
 * The sonner toaster is mounted once here for the whole app.
 */
@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIcon, ZardSidebarImports, ZardSonnerComponent],
  viewProviders: [provideIcons({ lucideTicket })],
  template: `
    <z-sidebar-provider>
      <z-sidebar zCollapsible="offcanvas">
        <z-sidebar-header class="p-4">
          <div class="flex items-center gap-2">
            <span class="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold">T</span>
            <span class="text-base font-semibold tracking-tight">Ticket Tracker</span>
          </div>
        </z-sidebar-header>

        <z-sidebar-content class="px-2">
          <z-sidebar-group>
            <z-sidebar-group-label>Workspace</z-sidebar-group-label>
            <z-sidebar-group-content>
              <ul z-sidebar-menu>
                <li z-sidebar-menu-item>
                  <a
                    z-sidebar-menu-button
                    routerLink="/tickets"
                    routerLinkActive
                    #ticketsLink="routerLinkActive"
                    [zActive]="ticketsLink.isActive"
                  >
                    <ng-icon name="lucideTicket" />
                    <span>Tickets</span>
                  </a>
                </li>
              </ul>
            </z-sidebar-group-content>
          </z-sidebar-group>
        </z-sidebar-content>
      </z-sidebar>

      <main z-sidebar-inset>
        <!-- Slim header: holds only the mobile sidebar trigger. Hidden on desktop,
             where the sidebar is always visible. Keeps the "no top nav" rule. -->
        <header class="flex h-14 items-center gap-2 border-b px-4 md:hidden">
          <button z-sidebar-trigger aria-label="Open navigation"></button>
          <span class="text-sm font-medium">Ticket Tracker</span>
        </header>

        <div class="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
          <router-outlet />
        </div>
      </main>
    </z-sidebar-provider>

    <!-- One toaster for the whole app: top-center, rich semantic colors. -->
    <z-sonner position="top-center" [richColors]="true" />
  `,
})
export class ShellComponent {}
