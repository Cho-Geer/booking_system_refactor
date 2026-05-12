import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecentUsersTableComponent } from './recent-users-table.component';
import { By } from '@angular/platform-browser';

describe('RecentUsersTableComponent', () => {
  let component: RecentUsersTableComponent;
  let fixture: ComponentFixture<RecentUsersTableComponent>;

  const mockRows = [
    {
      user: { id: '1', name: 'Alice Johnson', email: 'al***@example.com', role: 'ADMIN', status: 'ACTIVE', createdAt: '2026-01-15T10:00:00Z' },
      initials: 'AJ', initialsBg: 'bg-accent-green/30 text-accent-green', roleBadge: 'processing' as const,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecentUsersTableComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(RecentUsersTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('rows', mockRows);
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());

  it('[Red] should render user name', () => {
    expect(fixture.nativeElement.textContent).toContain('Alice Johnson');
  });

  it('[Red] should emit rowClick when view button clicked', () => {
    const spy = jest.spyOn(component.rowClick, 'emit');
    const btn = fixture.debugElement.query(By.css('app-button'));
    btn.triggerEventHandler('onClick', null);
    expect(spy).toHaveBeenCalledWith(mockRows[0]);
  });
});