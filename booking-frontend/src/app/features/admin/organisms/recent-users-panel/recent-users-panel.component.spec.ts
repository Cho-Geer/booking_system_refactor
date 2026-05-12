import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecentUsersPanelComponent } from './recent-users-panel.component';
import { RouterTestingModule } from '@angular/router/testing';
import { By } from '@angular/platform-browser';

describe('RecentUsersPanelComponent', () => {
  let component: RecentUsersPanelComponent;
  let fixture: ComponentFixture<RecentUsersPanelComponent>;

  const mockRows = [
    {
      user: { id: '1', name: 'Alice Johnson', email: 'al***@example.com', role: 'ADMIN', status: 'ACTIVE', createdAt: '2026-01-15T10:00:00Z' },
      initials: 'AJ', initialsBg: 'bg-accent-green/30 text-accent-green', roleBadge: 'processing' as const,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecentUsersPanelComponent, RouterTestingModule],
    }).compileComponents();
    fixture = TestBed.createComponent(RecentUsersPanelComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('rows', mockRows);
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());

  it('[Red] should display "Recent Users" heading', () => {
    expect(fixture.nativeElement.textContent).toContain('Recent Users');
  });

  it('[Red] should have "View All" link to /admin/users', () => {
    const link = fixture.nativeElement.querySelector('a[routerLink]');
    expect(link).toBeTruthy();
    expect(link.getAttribute('routerLink')).toBe('/admin/users');
    expect(link.textContent).toContain('View All');
  });

  it('[Red] should render recent-users-table', () => {
    expect(fixture.nativeElement.querySelector('app-recent-users-table')).toBeTruthy();
  });
});