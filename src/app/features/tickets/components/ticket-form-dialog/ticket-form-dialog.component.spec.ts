import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ZardDialogRef } from '@/shared/components/dialog/dialog-ref';
import { Z_MODAL_DATA } from '@/shared/components/dialog/dialog.service';

import { TicketFormDialogComponent, type TicketDialogData } from './ticket-form-dialog.component';
import { TicketsApiService } from '../../tickets-api.service';
import type { Ticket } from '../../ticket.model';

const sampleTicket: Ticket = {
  id: 't1',
  title: 'Login bug',
  description: 'Fails on submit',
  status: 'open',
  priority: 'high',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

class ApiStub {
  updatedWith: { id: string; dto: unknown } | null = null;
  getTicketById = () => of(sampleTicket);
  getTicketHistory = () => of([]);
  createTicket = () => of(sampleTicket);
  updateTicket = (id: string, dto: unknown) => {
    this.updatedWith = { id, dto };
    return of({ ...sampleTicket, ...(dto as object) });
  };
}

class DialogRefStub {
  closedWith: unknown = undefined;
  close(result?: unknown) {
    this.closedWith = result;
  }
}

async function setup(data: TicketDialogData) {
  const api = new ApiStub();
  const ref = new DialogRefStub();
  await TestBed.configureTestingModule({
    imports: [TicketFormDialogComponent],
    providers: [
      { provide: TicketsApiService, useValue: api },
      { provide: ZardDialogRef, useValue: ref },
      { provide: Z_MODAL_DATA, useValue: data },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(TicketFormDialogComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, api, ref, cmp: fixture.componentInstance as unknown as Record<string, any> };
}

describe('TicketFormDialogComponent', () => {
  it('create mode fixes status to open and disables it', async () => {
    const { cmp } = await setup({ mode: 'create' });
    expect(cmp['form'].controls.status.value).toBe('open');
    expect(cmp['form'].controls.status.disabled).toBe(true);
    expect(cmp['isCreate']()).toBe(true);
  });

  it('edit mode offers only the current status and its next valid transition', async () => {
    const { cmp } = await setup({ mode: 'edit', ticketId: 't1' });
    const options = cmp['statusOptions']() as { value: string }[];
    // open -> can advance to in_progress only.
    expect(options.map((o) => o.value)).toEqual(['open', 'in_progress']);
  });

  it('save sends only changed fields', async () => {
    const { cmp, api, ref } = await setup({ mode: 'edit', ticketId: 't1' });
    // Change only the priority.
    cmp['form'].controls.priority.setValue('low');
    cmp['form'].markAsDirty();
    cmp['submit']();

    expect(api.updatedWith).toEqual({ id: 't1', dto: { priority: 'low' } });
    expect(ref.closedWith).toBe('saved');
  });

  it('closed tickets lock the status', async () => {
    const api = new ApiStub();
    api.getTicketById = () => of({ ...sampleTicket, status: 'closed' });
    const ref = new DialogRefStub();
    await TestBed.configureTestingModule({
      imports: [TicketFormDialogComponent],
      providers: [
        { provide: TicketsApiService, useValue: api },
        { provide: ZardDialogRef, useValue: ref },
        { provide: Z_MODAL_DATA, useValue: { mode: 'edit', ticketId: 't1' } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(TicketFormDialogComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const cmp = fixture.componentInstance as unknown as Record<string, any>;
    expect(cmp['statusLocked']()).toBe(true);
  });
});
