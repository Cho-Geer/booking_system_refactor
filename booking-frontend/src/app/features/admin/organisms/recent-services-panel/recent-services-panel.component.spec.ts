import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecentServicesPanelComponent } from './recent-services-panel.component';
import { RouterTestingModule } from '@angular/router/testing';
import { By } from '@angular/platform-browser';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../../core/services/translation.service';

describe('RecentServicesPanelComponent', () => {
  let component: RecentServicesPanelComponent;
  let fixture: ComponentFixture<RecentServicesPanelComponent>;

  const mockRows = [
    {
      service: { id: '1', name: 'Haircut', description: 'Standard haircut', duration: 30, price: 25, active: true, createdAt: '2026-01-01T10:00:00Z' },
      statusBadge: 'confirmed' as const,
    },
  ];

  const mockTranslationService = {
    t: jest.fn((domain: string, key: string) => {
      const translations: Record<string, Record<string, string>> = {
        admin: { 'dashboard.popularServices': 'Recent Services' },
      };
      return translations?.[domain]?.[key] ?? `{{${domain}.${key}}}`;
    }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecentServicesPanelComponent, RouterTestingModule, TranslatePipe],
      providers: [
        { provide: TranslationService, useValue: mockTranslationService },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(RecentServicesPanelComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('rows', mockRows);
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());

  it('[Red] should display "Recent Services" heading via translate pipe', () => {
    expect(fixture.nativeElement.textContent).toContain('Recent Services');
  });

  it('[Red] should have "View All" link to /admin/services', () => {
    const link = fixture.nativeElement.querySelector('a[routerLink]');
    expect(link).toBeTruthy();
    expect(link.getAttribute('routerLink')).toBe('/admin/services');
    expect(link.textContent).toContain('View All');
  });

  it('[Red] should render recent-services-table', () => {
    expect(fixture.nativeElement.querySelector('app-recent-services-table')).toBeTruthy();
  });
});