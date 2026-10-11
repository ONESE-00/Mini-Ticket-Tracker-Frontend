import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { mockApiInterceptor } from '../../../../core/mock/mock-api.interceptor';
import TicketsPageComponent from './tickets-page.component';

/**
 * Integration test: the page wired to the mock backend should load seeded
 * tickets and stats through the real service + interceptor path.
 */
describe('TicketsPageComponent (integration with mock)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketsPageComponent],
      providers: [provideRouter([]), provideHttpClient(withInterceptors([mockApiInterceptor]))],
    }).compileComponents();
  });

  it('loads and renders seeded tickets and stats from the mock', async () => {
    const fixture = TestBed.createComponent(TicketsPageComponent);
    fixture.detectChanges();

    // Let the mock interceptor's artificial delay (200–400ms) resolve.
    await new Promise((r) => setTimeout(r, 600));
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    // Stats cards populated from the mock (30 seeded tickets).
    expect(text).toContain('Total');
    expect(text).toContain('30');
    // Default sort is createdAt,desc so the newest seeded ticket shows first.
    expect(text).toContain('Support multi-select in filters');
    // Footer count reflects the loaded page.
    expect(text).toContain('Showing 1 to 10 of 30');
  });
});
