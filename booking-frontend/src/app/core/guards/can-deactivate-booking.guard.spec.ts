import { TestBed } from '@angular/core/testing';
import { canDeactivateBookingGuard, HasUnsavedChanges } from './can-deactivate-booking.guard';

describe('canDeactivateBookingGuard', () => {
  function createComponentMock(hasUnsavedChanges: boolean): HasUnsavedChanges {
    return {
      hasUnsavedChanges: () => hasUnsavedChanges,
    };
  }

  let confirmSpy: jest.SpyInstance;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    confirmSpy = jest.spyOn(window, 'confirm');
  });

  it('should allow navigation when no unsaved changes', () => {
    const component = createComponentMock(false);

    const result = TestBed.runInInjectionContext(() =>
      canDeactivateBookingGuard(component, {} as any, {} as any, {} as any)
    );

    expect(result).toBe(true);
  });

  it('should show confirm dialog when has unsaved changes and allow navigation on confirm', () => {
    const component = createComponentMock(true);
    confirmSpy.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      canDeactivateBookingGuard(component, {} as any, {} as any, {} as any)
    );

    expect(confirmSpy).toHaveBeenCalledWith(
      'You have an incomplete booking. Are you sure you want to leave?'
    );
    expect(result).toBe(true);
  });

  it('should prevent navigation when user cancels confirm dialog', () => {
    const component = createComponentMock(true);
    confirmSpy.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      canDeactivateBookingGuard(component, {} as any, {} as any, {} as any)
    );

    expect(confirmSpy).toHaveBeenCalledWith(
      'You have an incomplete booking. Are you sure you want to leave?'
    );
    expect(result).toBe(false);
  });
});
