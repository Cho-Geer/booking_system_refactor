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
    fixture.componentRef.setInput('status', 'confirmed');
    fixture.componentRef.setInput('customLabel', undefined);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('span');
    expect(el.textContent).toContain('已确认');
  });

  it('should show custom label when provided', () => {
    fixture.componentRef.setInput('customLabel', 'Custom');
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('span');
    expect(el.textContent).toContain('Custom');
  });

  describe('status colors', () => {
    it('[RED] should apply pending status color classes', () => {
      fixture.componentRef.setInput('status', 'pending');
      fixture.detectChanges();
      const el = fixture.nativeElement.querySelector('span');
      expect(el.classList.contains('app-badge--pending')).toBe(true);
    });

    it('[RED] should apply confirmed status color classes', () => {
      fixture.componentRef.setInput('status', 'confirmed');
      fixture.detectChanges();
      const el = fixture.nativeElement.querySelector('span');
      expect(el.classList.contains('app-badge--confirmed')).toBe(true);
    });

    it('[RED] should apply completed status color classes', () => {
      fixture.componentRef.setInput('status', 'completed');
      fixture.detectChanges();
      const el = fixture.nativeElement.querySelector('span');
      expect(el.classList.contains('app-badge--completed')).toBe(true);
    });

    it('[RED] should apply cancelled status color classes', () => {
      fixture.componentRef.setInput('status', 'cancelled');
      fixture.detectChanges();
      const el = fixture.nativeElement.querySelector('span');
      expect(el.classList.contains('app-badge--cancelled')).toBe(true);
    });

    it('[RED] should apply expired status color classes', () => {
      fixture.componentRef.setInput('status', 'expired');
      fixture.detectChanges();
      const el = fixture.nativeElement.querySelector('span');
      expect(el.classList.contains('app-badge--expired')).toBe(true);
    });

    it('[RED] should apply processing status color classes', () => {
      fixture.componentRef.setInput('status', 'processing');
      fixture.detectChanges();
      const el = fixture.nativeElement.querySelector('span');
      expect(el.classList.contains('app-badge--processing')).toBe(true);
    });
  });

  describe('size system', () => {
    it('[RED] should default size to "md"', () => {
      expect(component.size()).toBe('md');
    });

    it('[RED] should apply sm size class', () => {
      fixture.componentRef.setInput('size', 'sm');
      fixture.detectChanges();
      const el = fixture.nativeElement.querySelector('span');
      expect(el.classList.contains('app-badge--sm')).toBe(true);
    });

    it('[RED] should apply md size class', () => {
      fixture.componentRef.setInput('size', 'md');
      fixture.detectChanges();
      const el = fixture.nativeElement.querySelector('span');
      expect(el.classList.contains('app-badge--md')).toBe(true);
    });

    it('[RED] should apply lg size class', () => {
      fixture.componentRef.setInput('size', 'lg');
      fixture.detectChanges();
      const el = fixture.nativeElement.querySelector('span');
      expect(el.classList.contains('app-badge--lg')).toBe(true);
    });
  });

  describe('shape system', () => {
    it('[RED] should default shape to "rounded"', () => {
      expect(component.shape()).toBe('rounded');
    });

    it('[RED] should apply rounded shape class', () => {
      fixture.componentRef.setInput('shape', 'rounded');
      fixture.detectChanges();
      const el = fixture.nativeElement.querySelector('span');
      expect(el.classList.contains('app-badge--rounded')).toBe(true);
    });

    it('[RED] should apply pill shape class', () => {
      fixture.componentRef.setInput('shape', 'pill');
      fixture.detectChanges();
      const el = fixture.nativeElement.querySelector('span');
      expect(el.classList.contains('app-badge--pill')).toBe(true);
    });
  });

  describe('glass mode', () => {
    it('[RED] should have glass input default to false', () => {
      expect(component.glass()).toBe(false);
    });

    it('[RED] should apply glass styling classes when glass is true', () => {
      fixture.componentRef.setInput('glass', true);
      fixture.componentRef.setInput('status', 'confirmed');
      fixture.detectChanges();
      const el = fixture.nativeElement.querySelector('span');
      expect(el.classList.contains('app-badge--glass')).toBe(true);
    });
  });
});
