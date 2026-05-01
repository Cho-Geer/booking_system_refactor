import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppEmptyStateComponent } from './app-empty-state.component';

describe('AppEmptyStateComponent', () => {
  let component: AppEmptyStateComponent;
  let fixture: ComponentFixture<AppEmptyStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppEmptyStateComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(AppEmptyStateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display title', () => {
    component.title = 'No items';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No items');
  });

  it('should show description when provided', () => {
    component.description = 'Nothing to show';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nothing to show');
  });

  it('should show action button when actionLabel is set', () => {
    component.actionLabel = 'Create';
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button');
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain('Create');
  });

  it('should emit action on button click', () => {
    let emitted = false;
    component.actionLabel = 'Go';
    component.action.subscribe(() => (emitted = true));
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click();
    expect(emitted).toBeTrue();
  });

  it('should not show button when no actionLabel', () => {
    expect(fixture.nativeElement.querySelector('button')).toBeFalsy();
  });
});
