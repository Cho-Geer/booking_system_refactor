import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppToggleComponent } from './app-toggle.component';

describe('AppToggleComponent', () => {
  let component: AppToggleComponent;
  let fixture: ComponentFixture<AppToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppToggleComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(AppToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start unchecked', () => {
    expect(component.checked).toBe(false);
  });

  it('should toggle on click', () => {
    fixture.nativeElement.querySelector('button').click();
    expect(component.checked).toBe(true);
  });

  it('should not toggle when disabled', () => {
    component.disabled = true;
    fixture.nativeElement.querySelector('button').click();
    expect(component.checked).toBe(false);
  });

  it('should emit checkedChange on toggle', () => {
    let emitted: boolean | undefined;
    component.checkedChange.subscribe((v: boolean) => (emitted = v));
    fixture.nativeElement.querySelector('button').click();
    expect(emitted).toBe(true);
  });

  it('should implement ControlValueAccessor', () => {
    component.writeValue(true);
    expect(component.checked).toBe(true);
  });

  describe('toggle switch smooth transition', () => {
    it('[RED] should have transition-colors on toggle button', () => {
      fixture.detectChanges();
      const btn = fixture.nativeElement.querySelector('button');
      expect(btn).toBeTruthy();
      // transition-colors should be applied
      expect(btn.classList.contains('transition-colors')).toBe(true);
      expect(btn.classList.contains('duration-200')).toBe(true);
    });

    it('[RED] should have transition-transform on toggle thumb', () => {
      fixture.detectChanges();
      const thumb = fixture.nativeElement.querySelector('button span');
      expect(thumb).toBeTruthy();
      expect(thumb.classList.contains('transition-transform')).toBe(true);
      expect(thumb.classList.contains('duration-200')).toBe(true);
    });

    it('[RED] should have gradient-primary background when checked', () => {
      // Click to toggle checked state
      const btn = fixture.nativeElement.querySelector('button');
      expect(btn).toBeTruthy();
      btn.click();
      fixture.detectChanges();
      expect(component.checked).toBe(true);
      expect(btn.classList.contains('gradient-primary')).toBe(true);
    });
  });
});
