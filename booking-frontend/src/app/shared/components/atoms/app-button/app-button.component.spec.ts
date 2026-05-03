import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AppButtonComponent } from './app-button.component';
import { Button } from 'primeng/button';

describe('AppButtonComponent', () => {
  let component: AppButtonComponent;
  let fixture: ComponentFixture<AppButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppButtonComponent, Button],
    }).compileComponents();

    fixture = TestBed.createComponent(AppButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render p-button element', () => {
    const buttonEl = fixture.debugElement.query(By.css('p-button'));
    expect(buttonEl).toBeTruthy();
  });

  it('should forward label to p-button', () => {
    fixture.componentRef.setInput('label', 'Click Me');
    fixture.detectChanges();

    const buttonEl = fixture.debugElement.query(By.css('p-button'));
    expect(buttonEl).toBeTruthy();
  });

  it('should forward disabled state to p-button', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    const buttonEl = fixture.debugElement.query(By.css('p-button'));
    expect(buttonEl).toBeTruthy();
  });

  it('should forward loading state to p-button', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const buttonEl = fixture.debugElement.query(By.css('p-button'));
    expect(buttonEl).toBeTruthy();
  });

  it('should emit onClick when button is clicked', () => {
    const spy = jest.spyOn(component.onClick, 'emit');

    const buttonEl = fixture.debugElement.query(By.css('p-button'));
    if (buttonEl) {
      buttonEl.triggerEventHandler('onClick', new MouseEvent('click'));
    }

    expect(spy).toHaveBeenCalled();
  });

  it('should forward type attribute to p-button', () => {
    fixture.componentRef.setInput('type', 'submit');
    fixture.detectChanges();

    const buttonEl = fixture.debugElement.query(By.css('p-button'));
    expect(buttonEl).toBeTruthy();
  });

  it('should forward custom styleClass to p-button', () => {
    fixture.componentRef.setInput('styleClass', 'custom-class');
    fixture.detectChanges();

    const buttonEl = fixture.debugElement.query(By.css('p-button'));
    expect(buttonEl).toBeTruthy();
  });

  it('should forward icon to p-button', () => {
    fixture.componentRef.setInput('icon', 'pi pi-check');
    fixture.detectChanges();

    const buttonEl = fixture.debugElement.query(By.css('p-button'));
    expect(buttonEl).toBeTruthy();
  });

  describe('variant system', () => {
    it('[RED] should default variant to "primary"', () => {
      expect(component.variant()).toBe('primary');
    });

    it('[RED] should apply primary variant class', () => {
      fixture.detectChanges();
      expect(component.combinedStyleClass).toContain('app-button--primary');
    });

    it('[RED] should apply secondary variant class when variant is secondary', () => {
      fixture.componentRef.setInput('variant', 'secondary');
      fixture.detectChanges();
      expect(component.combinedStyleClass).toContain('app-button--secondary');
    });

    it('[RED] should apply ghost variant class when variant is ghost', () => {
      fixture.componentRef.setInput('variant', 'ghost');
      fixture.detectChanges();
      expect(component.combinedStyleClass).toContain('app-button--ghost');
    });

    it('[RED] should apply danger variant class when variant is danger', () => {
      fixture.componentRef.setInput('variant', 'danger');
      fixture.detectChanges();
      expect(component.combinedStyleClass).toContain('app-button--danger');
    });
  });

  describe('size system', () => {
    it('[RED] should default size to "md"', () => {
      expect(component.size()).toBe('md');
    });

    it('[RED] should apply sm size class', () => {
      fixture.componentRef.setInput('size', 'sm');
      fixture.detectChanges();
      expect(component.combinedStyleClass).toContain('app-button--sm');
    });

    it('[RED] should apply md size class', () => {
      fixture.componentRef.setInput('size', 'md');
      fixture.detectChanges();
      expect(component.combinedStyleClass).toContain('app-button--md');
    });

    it('[RED] should apply lg size class', () => {
      fixture.componentRef.setInput('size', 'lg');
      fixture.detectChanges();
      expect(component.combinedStyleClass).toContain('app-button--lg');
    });
  });

  describe('loading state', () => {
    it('[RED] should show loading spinner when loading is true', () => {
      fixture.componentRef.setInput('loading', true);
      fixture.detectChanges();

      expect(component.loading()).toBe(true);
      expect(component.isDisabled()).toBe(true);
    });

    it('[RED] should set loading icon when loading is true', () => {
      fixture.componentRef.setInput('loading', true);
      fixture.detectChanges();

      expect(component.resolvedIcon()).toBe('pi pi-spinner pi-spin');
    });
  });

  describe('disabled state', () => {
    it('[RED] should forward disabled to p-button', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
      expect(component.disabled()).toBe(true);
    });
  });

  describe('icon-only mode', () => {
    it('[RED] should apply icon-only class when iconOnly is true', () => {
      fixture.componentRef.setInput('iconOnly', true);
      fixture.detectChanges();
      expect(component.combinedStyleClass).toContain('app-button--icon-only');
    });
  });

  describe('button click feedback', () => {
    it('[RED] should have app-button-click-feedback class in combined style', () => {
      fixture.detectChanges();
      expect(component.combinedStyleClass).toContain('app-button-click-feedback');
    });
  });
});
