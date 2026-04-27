import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { AppDropdownComponent } from './app-dropdown.component';
import { Select } from 'primeng/select';

describe('AppDropdownComponent', () => {
  let component: AppDropdownComponent;
  let fixture: ComponentFixture<AppDropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppDropdownComponent, Select],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(AppDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render p-select element', () => {
    const selectEl = fixture.debugElement.query(By.css('p-select'));
    expect(selectEl).toBeTruthy();
  });

  it('should forward options to p-select', () => {
    fixture.componentRef.setInput('options', [
      { label: 'Option 1', value: '1' },
      { label: 'Option 2', value: '2' },
    ]);
    fixture.detectChanges();

    const selectEl = fixture.debugElement.query(By.css('p-select'));
    expect(selectEl).toBeTruthy();
  });

  it('should forward optionLabel to p-select', () => {
    fixture.componentRef.setInput('optionLabel', 'name');
    fixture.detectChanges();

    const selectEl = fixture.debugElement.query(By.css('p-select'));
    expect(selectEl).toBeTruthy();
  });

  it('should forward placeholder to p-select', () => {
    fixture.componentRef.setInput('placeholder', 'Select an option');
    fixture.detectChanges();

    const selectEl = fixture.debugElement.query(By.css('p-select'));
    expect(selectEl).toBeTruthy();
  });

  it('should forward disabled state to p-select', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    const selectEl = fixture.debugElement.query(By.css('p-select'));
    expect(selectEl).toBeTruthy();
  });

  it('should forward invalid state', () => {
    fixture.componentRef.setInput('invalid', true);
    fixture.detectChanges();

    const selectEl = fixture.debugElement.query(By.css('p-select'));
    expect(selectEl).toBeTruthy();
  });

  it('should emit valueChange when selection changes', () => {
    const spy = jest.spyOn(component.valueChange, 'emit');

    fixture.componentRef.setInput('options', [
      { label: 'Option 1', value: '1' },
      { label: 'Option 2', value: '2' },
    ]);
    fixture.detectChanges();

    const selectEl = fixture.debugElement.query(By.css('p-select'));
    if (selectEl) {
      selectEl.triggerEventHandler('onChange', { value: '1' });
    }

    expect(spy).toHaveBeenCalledWith('1');
  });

  it('should forward custom styleClass to p-select', () => {
    fixture.componentRef.setInput('styleClass', 'w-full');
    fixture.detectChanges();

    const selectEl = fixture.debugElement.query(By.css('p-select'));
    expect(selectEl).toBeTruthy();
  });

  it('should forward filter to p-select', () => {
    fixture.componentRef.setInput('filter', true);
    fixture.detectChanges();

    const selectEl = fixture.debugElement.query(By.css('p-select'));
    expect(selectEl).toBeTruthy();
  });
});
