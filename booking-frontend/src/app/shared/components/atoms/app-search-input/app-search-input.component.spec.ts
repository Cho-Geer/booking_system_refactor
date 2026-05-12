import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AppSearchInputComponent } from './app-search-input.component';

describe('AppSearchInputComponent', () => {
  let component: AppSearchInputComponent;
  let fixture: ComponentFixture<AppSearchInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppSearchInputComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AppSearchInputComponent);
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
    fixture.componentRef.setInput('placeholder', 'Search...');
    fixture.detectChanges();

    const inputEl = fixture.debugElement.query(By.css('input'));
    expect(inputEl.nativeElement.getAttribute('placeholder')).toBe('Search...');
  });

  it('should update inputValue on ngModelChange', () => {
    component.onValueChange('test');
    fixture.detectChanges();

    expect(component.inputValue()).toBe('test');
  });

  it('should show dropdown when input meets minLength and has suggestions', () => {
    fixture.componentRef.setInput('suggestions', [
      { label: 'Alice', value: '1' },
      { label: 'Bob', value: '2' },
    ]);
    fixture.componentRef.setInput('minLength', 1);
    fixture.detectChanges();

    component.onValueChange('a');
    fixture.detectChanges();

    expect(component.showDropdown()).toBe(true);
    expect(component.filteredSuggestions().length).toBe(1);
    expect(component.filteredSuggestions()[0].label).toBe('Alice');
  });

  it('should hide dropdown when input is below minLength', () => {
    fixture.componentRef.setInput('suggestions', [
      { label: 'Alice', value: '1' },
    ]);
    fixture.componentRef.setInput('minLength', 2);
    fixture.detectChanges();

    component.onValueChange('a');
    fixture.detectChanges();

    expect(component.showDropdown()).toBe(false);
    expect(component.filteredSuggestions().length).toBe(0);
  });

  it('should select suggestion and emit suggestionSelect', () => {
    const spy = jest.spyOn(component.suggestionSelect, 'emit');
    fixture.componentRef.setInput('suggestions', [
      { label: 'Alice', value: '1' },
    ]);
    fixture.detectChanges();

    component.selectSuggestion({ label: 'Alice', value: '1' });
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith('Alice');
    expect(component.showDropdown()).toBe(false);
  });

  it('should emit valueChange through debounced subject', (done) => {
    fixture.componentRef.setInput('debounceMs', 10);
    fixture.detectChanges();

    component.valueChange.subscribe(value => {
      expect(value).toBe('test');
      done();
    });

    component.onValueChange('test');
  });

  it('should close dropdown on Escape key', () => {
    component.showDropdown.set(true);
    fixture.detectChanges();

    fixture.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(component.showDropdown()).toBe(false);
  });

  it('should close dropdown on click outside', () => {
    component.showDropdown.set(true);
    fixture.detectChanges();

    document.dispatchEvent(new MouseEvent('click'));
    fixture.detectChanges();

    expect(component.showDropdown()).toBe(false);
  });

  it('should apply custom styleClass', () => {
    fixture.componentRef.setInput('styleClass', 'w-full');
    fixture.detectChanges();

    const inputEl = fixture.debugElement.query(By.css('input'));
    expect(inputEl.nativeElement.classList.contains('w-full')).toBeTruthy();
  });

  it('should sync inputValue when value input changes externally', () => {
    fixture.componentRef.setInput('value', 'external value');
    fixture.detectChanges();

    expect(component.inputValue()).toBe('external value');
  });
});
