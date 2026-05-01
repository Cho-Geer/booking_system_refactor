import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppBadgeComponent, BadgeStatus } from './app-badge.component';

describe('AppBadgeComponent', () => {
  let component: AppBadgeComponent;
  let fixture: ComponentFixture<AppBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppBadgeComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(AppBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display default pending label', () => {
    const el = fixture.nativeElement.querySelector('span');
    expect(el.textContent).toContain('待确认');
  });

  it('should show correct label for confirmed status', () => {
    component.status = 'confirmed';
    component.customLabel = undefined;
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('span');
    expect(el.textContent).toContain('已确认');
  });

  it('should show custom label when provided', () => {
    component.customLabel = 'Custom';
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('span');
    expect(el.textContent).toContain('Custom');
  });

  it('should have correct CSS class for each status', () => {
    const statuses: BadgeStatus[] = ['pending', 'confirmed', 'completed', 'cancelled', 'expired', 'processing', 'error'];
    for (const s of statuses) {
      component.status = s;
      fixture.detectChanges();
      const el = fixture.nativeElement.querySelector('span');
      expect(el.classList.contains('rounded-full')).toBeTrue();
    }
  });
});
