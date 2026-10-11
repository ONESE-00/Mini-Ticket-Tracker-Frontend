import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { ZardButtonComponent } from '@/shared/components/button/button.component';
import { ZardFieldImports } from '@/shared/components/field/field.imports';
import { ZardInputComponent } from '@/shared/components/input/input.component';
import { ZardTextareaComponent } from '@/shared/components/textarea/textarea.component';
import { ZardSelectImports } from '@/shared/components/select/select.imports';
import { ZardSkeletonComponent } from '@/shared/components/skeleton/skeleton.component';
import { ZardDialogRef } from '@/shared/components/dialog/dialog-ref';
import { injectDialogData } from '@/shared/components/dialog/dialog.service';

import { TicketHistoryComponent } from '../ticket-history/ticket-history.component';
import { PRIORITY_LABELS, STATUS_LABELS, nextStatus } from '../../ticket.constants';
import type { CreateTicketDto, Ticket, TicketHistoryEntry, TicketPriority, TicketStatus, UpdateTicketDto } from '../../ticket.model';
import { TicketsApiService } from '../../tickets-api.service';

export type TicketDialogMode = 'create' | 'view' | 'edit';

/** Data passed into the dialog via ZardDialogService zData. */
export interface TicketDialogData {
  mode: TicketDialogMode;
  ticketId?: string;
  /** Called with 'saved' after a successful create/update so the page can refresh. */
  onResult?: (result: 'saved' | 'dismissed') => void;
}

interface StatusOption {
  value: TicketStatus;
  label: string;
}

@Component({
  selector: 'app-ticket-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ZardFieldImports, ZardInputComponent, ZardTextareaComponent, ZardSelectImports, ZardButtonComponent, ZardSkeletonComponent, TicketHistoryComponent],
  templateUrl: './ticket-form-dialog.component.html',
})
export class TicketFormDialogComponent {
  private readonly ticketsApi = inject(TicketsApiService);
  private readonly dialogRef = inject(ZardDialogRef);
  private readonly data = injectDialogData<TicketDialogData>();

  // ---- mode (mutable so View can flip to Edit in place)
  protected readonly mode = signal<TicketDialogMode>(this.data.mode);
  protected readonly isCreate = computed(() => this.mode() === 'create');
  protected readonly isView = computed(() => this.mode() === 'view');
  protected readonly isEdit = computed(() => this.mode() === 'edit');

  // ---- loaded ticket (for view/edit)
  protected readonly ticket = signal<Ticket | null>(null);
  protected readonly loadingTicket = signal(false);
  protected readonly loadError = signal(false);

  // ---- history
  protected readonly history = signal<TicketHistoryEntry[] | null>(null);
  protected readonly loadingHistory = signal(false);

  // ---- submit state
  protected readonly submitting = signal(false);

  // ---- select options
  protected readonly priorityOptions = (Object.keys(PRIORITY_LABELS) as TicketPriority[]).map((p) => ({ value: p, label: PRIORITY_LABELS[p] }));

  // ---- reactive form
  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
    description: new FormControl<string>('', { nonNullable: true }),
    priority: new FormControl<TicketPriority>('medium', { nonNullable: true, validators: [Validators.required] }),
    status: new FormControl<TicketStatus>('open', { nonNullable: true }),
  });

  /** Title for the dialog header, derived from mode. */
  protected readonly heading = computed(() => (this.isCreate() ? 'Create ticket' : this.isView() ? 'Ticket details' : 'Update ticket'));

  constructor() {
    if (this.data.mode === 'create') {
      // Status fixed to 'open' and disabled; priority editable.
      this.form.controls.status.setValue('open');
      this.form.controls.status.disable();
    } else if (this.data.ticketId) {
      this.loadTicket(this.data.ticketId);
      this.loadHistory(this.data.ticketId);
    }
  }

  // ---- status options for edit: current + next valid transition only
  protected readonly statusOptions = computed<StatusOption[]>(() => {
    const t = this.ticket();
    if (!t) {
      return [];
    }
    const options: StatusOption[] = [{ value: t.status, label: STATUS_LABELS[t.status] }];
    const next = nextStatus(t.status);
    if (next) {
      options.push({ value: next, label: STATUS_LABELS[next] });
    }
    return options;
  });

  /** Closed tickets lock their status (terminal). */
  protected readonly statusLocked = computed(() => this.ticket()?.status === 'closed');

  // ---- loading
  protected loadTicket(id: string): void {
    this.loadingTicket.set(true);
    this.loadError.set(false);
    this.ticketsApi.getTicketById(id).subscribe({
      next: (t) => {
        this.ticket.set(t);
        this.patchForm(t);
        this.applyModeState();
        this.loadingTicket.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loadingTicket.set(false);
      },
    });
  }

  protected loadHistory(id: string): void {
    this.loadingHistory.set(true);
    this.ticketsApi.getTicketHistory(id).subscribe({
      next: (h) => {
        this.history.set(h);
        this.loadingHistory.set(false);
      },
      error: () => this.loadingHistory.set(false),
    });
  }

  private patchForm(t: Ticket): void {
    this.form.setValue({
      title: t.title,
      description: t.description ?? '',
      priority: t.priority,
      status: t.status,
    });
    this.form.markAsPristine();
  }

  /** Enable/disable controls based on mode. */
  private applyModeState(): void {
    if (this.isView()) {
      this.form.disable();
    } else if (this.isEdit()) {
      this.form.enable();
      if (this.statusLocked()) {
        this.form.controls.status.disable();
      }
    }
  }

  // ---- mode transitions
  protected startEdit(): void {
    this.mode.set('edit');
    this.applyModeState();
  }

  protected cancelEdit(): void {
    if (this.form.dirty && !confirm('Discard your changes?')) {
      return;
    }
    const t = this.ticket();
    if (t) {
      this.patchForm(t);
    }
    this.mode.set('view');
    this.form.disable();
  }

  // ---- save
  protected submit(): void {
    if (this.submitting()) {
      return;
    }
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    this.submitting.set(true);
    if (this.isCreate()) {
      const dto: CreateTicketDto = {
        title: this.form.controls.title.value.trim(),
        description: this.form.controls.description.value.trim() || null,
        priority: this.form.controls.priority.value,
      };
      this.ticketsApi.createTicket(dto).subscribe({
        next: () => this.finishSaved(),
        error: (err) => this.handleSaveError(err),
      });
    } else {
      const t = this.ticket();
      if (!t) {
        this.submitting.set(false);
        return;
      }
      const dto = this.changedFields(t);
      if (Object.keys(dto).length === 0) {
        // Nothing changed — just return to view.
        this.submitting.set(false);
        this.mode.set('view');
        this.form.disable();
        return;
      }
      this.ticketsApi.updateTicket(t.id, dto).subscribe({
        next: () => this.finishSaved(),
        error: (err) => this.handleSaveError(err),
      });
    }
  }

  /** Only the fields that actually changed, so PATCH stays minimal. */
  private changedFields(t: Ticket): UpdateTicketDto {
    const dto: UpdateTicketDto = {};
    const title = this.form.controls.title.value.trim();
    const description = this.form.controls.description.value.trim() || null;
    const priority = this.form.controls.priority.value;
    const status = this.form.controls.status.value;

    if (title !== t.title) dto.title = title;
    if (description !== (t.description ?? null)) dto.description = description;
    if (priority !== t.priority) dto.priority = priority;
    if (!this.form.controls.status.disabled && status !== t.status) dto.status = status;
    return dto;
  }

  private finishSaved(): void {
    this.submitting.set(false);
    this.data.onResult?.('saved');
    this.dialogRef.close('saved');
  }

  private handleSaveError(err: unknown): void {
    this.submitting.set(false);
    // Map 400 fieldErrors onto the controls so inline messages show.
    if (err instanceof HttpErrorResponse && err.status === 400) {
      const fieldErrors = (err.error as { fieldErrors?: Record<string, string> })?.fieldErrors;
      if (fieldErrors) {
        for (const [key, message] of Object.entries(fieldErrors)) {
          const control = this.form.get(key);
          control?.setErrors({ server: message });
          control?.markAsTouched();
        }
      }
    }
    // The service already toasted a human message via handleResponse.
  }

  /** Server-side error message for a control, if any. */
  protected serverError(controlName: 'title' | 'description' | 'priority' | 'status'): string | null {
    const control = this.form.get(controlName);
    return control?.errors?.['server'] ?? null;
  }

  protected close(): void {
    this.data.onResult?.('dismissed');
    this.dialogRef.close('dismissed');
  }

  protected retry(): void {
    if (this.data.ticketId) {
      this.loadTicket(this.data.ticketId);
      this.loadHistory(this.data.ticketId);
    }
  }
}
