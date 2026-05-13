import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppEmptyStateComponent } from './app-empty-state.component';
import { TranslationService } from '../../../../core/services/translation.service';

describe('AppEmptyStateComponent', () => {
  let component: AppEmptyStateComponent;
  let fixture: ComponentFixture<AppEmptyStateComponent>;

  beforeEach(async () => {
    const mockTranslationService = {
      t: jest.fn((domain: string, key: string) => `{{${domain}.${key}}}`),
      locale: jest.fn().mockReturnValue('en'),
      translations: jest.fn().mockReturnValue({}),
    };

    await TestBed.configureTestingModule({
      imports: [AppEmptyStateComponent],
      providers: [
        { provide: TranslationService, useValue: mockTranslationService },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AppEmptyStateComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should display title when provided', () => {
    fixture.componentRef.setInput('title', 'No items');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No items');
  });

  it('should show default translated title when no title provided', () => {
    fixture.detectChanges();
    // Default title should come from translation
    const h3 = fixture.nativeElement.querySelector('h3');
    expect(h3).toBeTruthy();
    expect(h3.textContent.trim()).toBe('{{global.noData}}');
  });

  it('should show description when provided', () => {
    fixture.componentRef.setInput('description', 'Nothing to show');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nothing to show');
  });

  it('should show action button when actionLabel is set', () => {
    fixture.componentRef.setInput('actionLabel', 'Create');
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button');
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain('Create');
  });

  it('should emit action on button click', () => {
    fixture.componentRef.setInput('actionLabel', 'Go');
    fixture.detectChanges();
    let emitted = false;
    component.action.subscribe(() => (emitted = true));
    fixture.nativeElement.querySelector('button').click();
    expect(emitted).toBe(true);
  });

  it('should not show button when no actionLabel', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button')).toBeFalsy();
  });
});
