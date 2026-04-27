import { CanDeactivateFn } from '@angular/router';

/**
 * Interface for components that can report unsaved booking changes.
 *
 * Components implementing this interface will be checked by
 * `canDeactivateBookingGuard` before allowing navigation away.
 */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/**
 * Functional CanDeactivate guard for booking-related routes.
 *
 * Checks if the component has unsaved booking state by calling
 * `hasUnsavedChanges()`. If true, shows a browser confirm dialog
 * asking the user to confirm navigation.
 *
 * - Returns `true` immediately when no unsaved changes exist
 * - Returns `true` when user confirms leaving with unsaved changes
 * - Returns `false` when user cancels the confirm dialog
 */
export const canDeactivateBookingGuard: CanDeactivateFn<HasUnsavedChanges> = (
  component
) => {
  if (!component.hasUnsavedChanges()) {
    return true;
  }

  return window.confirm(
    'You have an incomplete booking. Are you sure you want to leave?'
  );
};
