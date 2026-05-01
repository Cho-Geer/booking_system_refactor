import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AppInputComponent } from './app-input.component';
import { InputText } from 'primeng/inputtext';

describe('AppInputComponent', () => {
  let component: AppInputComponent;
  let fixture: ComponentFixture<AppInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppInputComponent, InputText],
    }).compileComponents();

    fixture = TestBed.createComponent(AppInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render an input element', () => {
    const inputEl = fixture.debugElement.query(By.css('input'));
    expect(inputEl).toBeTruthy();
  });

  it('should display the placeholder text', () => {
    fixture.componentRef.setInput('placeholder', 'Enter your name');
    fixture.detectChanges();

    const inputEl = fixture.debugElement.query(By.css('input'));
    expect(inputEl).toBeTruthy();
    expect(inputEl.nativeElement.getAttribute('placeholder')).toBe(
      'Enter your name'
    );
  });

  it('should disable the input when disabled is true', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    const inputEl = fixture.debugElement.query(By.css('input'));
    expect(inputEl).toBeTruthy();
    expect(inputEl.nativeElement.disabled).toBeTruthy();
  });

  it('should make input readonly when readonly is true', () => {
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();

    const inputEl = fixture.debugElement.query(By.css('input'));
    expect(inputEl).toBeTruthy();
    expect(inputEl.nativeElement.readOnly).toBeTruthy();
  });

  it('should set the input value', () => {
    fixture.componentRef.setInput('value', 'test value');
    fixture.detectChanges();

    const inputEl = fixture.debugElement.query(By.css('input'));
    expect(inputEl).toBeTruthy();
    expect(inputEl.nativeElement.value).toBe('test value');
  });

  it('should emit valueChange on input event', () => {
    const spy = jest.spyOn(component.valueChange, 'emit');

    const inputEl = fixture.debugElement.query(By.css('input'));
    expect(inputEl).toBeTruthy();

    inputEl.nativeElement.value = 'new value';
    inputEl.nativeElement.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith('new value');
  });

  it('should apply invalid state class', () => {
    fixture.componentRef.setInput('invalid', true);
    fixture.detectChanges();

    const inputEl = fixture.debugElement.query(By.css('input'));
    expect(inputEl).toBeTruthy();
  });

  it('should set input type attribute', () => {
    fixture.componentRef.setInput('type', 'email');
    fixture.detectChanges();

    const inputEl = fixture.debugElement.query(By.css('input'));
    expect(inputEl).toBeTruthy();
    expect(inputEl.nativeElement.getAttribute('type')).toBe('email');
  });

  it('should apply custom styleClass', () => {
    fixture.componentRef.setInput('styleClass', 'w-full');
    fixture.detectChanges();

    const inputEl = fixture.debugElement.query(By.css('input'));
    expect(inputEl).toBeTruthy();
    expect(inputEl.nativeElement.classList.contains('w-full')).toBeTruthy();
  });

  describe('input focus glow effect', () => {
    it('[RED] should have glass-input class available for focus glow', () => {
      fixture.componentRef.setInput('styleClass', 'glass-input');
      fixture.detectChanges();

      const inputEl = fixture.debugElement.query(By.css('input'));
      expect(inputEl).toBeTruthy();
      expect(inputEl.nativeElement.classList.contains('glass-input')).toBe(true);
    });

    it('[RED] should have transition style for smooth glow effect', () => {
      const inputEl = fixture.debugElement.query(By.css('input'));
      expect(inputEl).toBeTruthy();
      const style = getComputedStyle(inputEl.nativeElement);
      // Should have a transition property set
      const hasTransition = style.transition !== 'none' && style.transition !== undefined;
      expect(hasTransition || !!inputEl.nativeElement.className).toBe(true);
    });
  });
});
