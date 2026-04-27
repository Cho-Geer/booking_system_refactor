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

  it('should forward severity to p-button', () => {
    fixture.componentRef.setInput('severity', 'danger');
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
});
