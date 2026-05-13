/**
 * Translation Seed Service
 *
 * Provides seedDefaultTranslations() function to populate the
 * TranslationDictionary table with ~200 default English records.
 *
 * GREEN PHASE implementation — makes translation-seed.spec.ts pass.
 */

import { PrismaClient } from '@prisma/client';

// ============================================================
// Type definition
// ============================================================

interface TranslationSeedEntry {
  domain: string;
  key: string;
  locale: string;
  value: string;
  isCustom: boolean;
  tenantId: string | null;
}

// ============================================================
// Seed data — ~205 default English records
// ============================================================

const DEFAULT_TRANSLATIONS: TranslationSeedEntry[] = [
  // ============================================================
  // 1. global — 25 entries
  // ============================================================
  { domain: 'global', key: 'save', locale: 'en', value: 'Save', isCustom: false, tenantId: null },
  { domain: 'global', key: 'cancel', locale: 'en', value: 'Cancel', isCustom: false, tenantId: null },
  { domain: 'global', key: 'delete', locale: 'en', value: 'Delete', isCustom: false, tenantId: null },
  { domain: 'global', key: 'edit', locale: 'en', value: 'Edit', isCustom: false, tenantId: null },
  { domain: 'global', key: 'confirm', locale: 'en', value: 'Confirm', isCustom: false, tenantId: null },
  { domain: 'global', key: 'back', locale: 'en', value: 'Back', isCustom: false, tenantId: null },
  { domain: 'global', key: 'next', locale: 'en', value: 'Next', isCustom: false, tenantId: null },
  { domain: 'global', key: 'submit', locale: 'en', value: 'Submit', isCustom: false, tenantId: null },
  { domain: 'global', key: 'loading', locale: 'en', value: 'Loading...', isCustom: false, tenantId: null },
  { domain: 'global', key: 'error', locale: 'en', value: 'Error', isCustom: false, tenantId: null },
  { domain: 'global', key: 'success', locale: 'en', value: 'Success', isCustom: false, tenantId: null },
  { domain: 'global', key: 'search', locale: 'en', value: 'Search', isCustom: false, tenantId: null },
  { domain: 'global', key: 'filter', locale: 'en', value: 'Filter', isCustom: false, tenantId: null },
  { domain: 'global', key: 'clear', locale: 'en', value: 'Clear', isCustom: false, tenantId: null },
  { domain: 'global', key: 'close', locale: 'en', value: 'Close', isCustom: false, tenantId: null },
  { domain: 'global', key: 'yes', locale: 'en', value: 'Yes', isCustom: false, tenantId: null },
  { domain: 'global', key: 'no', locale: 'en', value: 'No', isCustom: false, tenantId: null },
  { domain: 'global', key: 'ok', locale: 'en', value: 'OK', isCustom: false, tenantId: null },
  { domain: 'global', key: 'info', locale: 'en', value: 'Info', isCustom: false, tenantId: null },
  { domain: 'global', key: 'warning', locale: 'en', value: 'Warning', isCustom: false, tenantId: null },
  { domain: 'global', key: 'retry', locale: 'en', value: 'Retry', isCustom: false, tenantId: null },
  { domain: 'global', key: 'refresh', locale: 'en', value: 'Refresh', isCustom: false, tenantId: null },
  { domain: 'global', key: 'print', locale: 'en', value: 'Print', isCustom: false, tenantId: null },
  { domain: 'global', key: 'export', locale: 'en', value: 'Export', isCustom: false, tenantId: null },
  { domain: 'global', key: 'import', locale: 'en', value: 'Import', isCustom: false, tenantId: null },

  // ============================================================
  // 2. auth — 28 entries
  // ============================================================
  { domain: 'auth', key: 'login.title', locale: 'en', value: 'Sign In', isCustom: false, tenantId: null },
  { domain: 'auth', key: 'login.email', locale: 'en', value: 'Email Address', isCustom: false, tenantId: null },
  { domain: 'auth', key: 'login.password', locale: 'en', value: 'Password', isCustom: false, tenantId: null },
  { domain: 'auth', key: 'login.submit', locale: 'en', value: 'Sign In', isCustom: false, tenantId: null },
  { domain: 'auth', key: 'login.forgotPassword', locale: 'en', value: 'Forgot Password?', isCustom: false, tenantId: null },
  { domain: 'auth', key: 'login.noAccount', locale: 'en', value: "Don't have an account?", isCustom: false, tenantId: null },
  { domain: 'auth', key: 'login.register', locale: 'en', value: 'Create Account', isCustom: false, tenantId: null },
  { domain: 'auth', key: 'login.rememberMe', locale: 'en', value: 'Remember Me', isCustom: false, tenantId: null },
  { domain: 'auth', key: 'login.twoFactor', locale: 'en', value: 'Two-Factor Authentication', isCustom: false, tenantId: null },
  { domain: 'auth', key: 'register.title', locale: 'en', value: 'Create Account', isCustom: false, tenantId: null },
  { domain: 'auth', key: 'register.name', locale: 'en', value: 'Full Name', isCustom: false, tenantId: null },
  { domain: 'auth', key: 'register.email', locale: 'en', value: 'Email Address', isCustom: false, tenantId: null },
  { domain: 'auth', key: 'register.password', locale: 'en', value: 'Password', isCustom: false, tenantId: null },
  { domain: 'auth', key: 'register.confirmPassword', locale: 'en', value: 'Confirm Password', isCustom: false, tenantId: null },
  { domain: 'auth', key: 'register.submit', locale: 'en', value: 'Create Account', isCustom: false, tenantId: null },
  { domain: 'auth', key: 'register.haveAccount', locale: 'en', value: 'Already have an account?', isCustom: false, tenantId: null },
  { domain: 'auth', key: 'register.login', locale: 'en', value: 'Sign In', isCustom: false, tenantId: null },
  { domain: 'auth', key: 'register.phone', locale: 'en', value: 'Phone Number', isCustom: false, tenantId: null },
  { domain: 'auth', key: 'register.terms', locale: 'en', value: 'I agree to the Terms of Service', isCustom: false, tenantId: null },
  { domain: 'auth', key: 'logout', locale: 'en', value: 'Sign Out', isCustom: false, tenantId: null },
  { domain: 'auth', key: 'forgotPassword.title', locale: 'en', value: 'Reset Password', isCustom: false, tenantId: null },
  { domain: 'auth', key: 'forgotPassword.email', locale: 'en', value: 'Enter your email', isCustom: false, tenantId: null },
  { domain: 'auth', key: 'forgotPassword.sendCode', locale: 'en', value: 'Send Code', isCustom: false, tenantId: null },
  { domain: 'auth', key: 'forgotPassword.resetPassword', locale: 'en', value: 'Reset Password', isCustom: false, tenantId: null },
  { domain: 'auth', key: 'forgotPassword.success', locale: 'en', value: 'Password reset email sent', isCustom: false, tenantId: null },
  { domain: 'auth', key: 'verificationCode.send', locale: 'en', value: 'Send Verification Code', isCustom: false, tenantId: null },
  { domain: 'auth', key: 'verificationCode.verify', locale: 'en', value: 'Verify Code', isCustom: false, tenantId: null },
  { domain: 'auth', key: 'verificationCode.code', locale: 'en', value: 'Verification Code', isCustom: false, tenantId: null },

  // ============================================================
  // 3. booking — 26 entries
  // ============================================================
  { domain: 'booking', key: 'title', locale: 'en', value: 'Book an Appointment', isCustom: false, tenantId: null },
  { domain: 'booking', key: 'selectService', locale: 'en', value: 'Select Service', isCustom: false, tenantId: null },
  { domain: 'booking', key: 'selectDateTime', locale: 'en', value: 'Select Date & Time', isCustom: false, tenantId: null },
  { domain: 'booking', key: 'selectSlot', locale: 'en', value: 'Select Time Slot', isCustom: false, tenantId: null },
  { domain: 'booking', key: 'confirmBooking', locale: 'en', value: 'Confirm Booking', isCustom: false, tenantId: null },
  { domain: 'booking', key: 'bookingSuccess', locale: 'en', value: 'Booking Confirmed!', isCustom: false, tenantId: null },
  { domain: 'booking', key: 'bookingFailed', locale: 'en', value: 'Booking Failed', isCustom: false, tenantId: null },
  { domain: 'booking', key: 'myBookings', locale: 'en', value: 'My Bookings', isCustom: false, tenantId: null },
  { domain: 'booking', key: 'noBookings', locale: 'en', value: 'No bookings found', isCustom: false, tenantId: null },
  { domain: 'booking', key: 'cancelBooking', locale: 'en', value: 'Cancel Booking', isCustom: false, tenantId: null },
  { domain: 'booking', key: 'reschedule', locale: 'en', value: 'Reschedule', isCustom: false, tenantId: null },
  { domain: 'booking', key: 'duration', locale: 'en', value: 'Duration', isCustom: false, tenantId: null },
  { domain: 'booking', key: 'price', locale: 'en', value: 'Price', isCustom: false, tenantId: null },
  { domain: 'booking', key: 'date', locale: 'en', value: 'Date', isCustom: false, tenantId: null },
  { domain: 'booking', key: 'time', locale: 'en', value: 'Time', isCustom: false, tenantId: null },
  { domain: 'booking', key: 'notes', locale: 'en', value: 'Notes', isCustom: false, tenantId: null },
  { domain: 'booking', key: 'contactInfo', locale: 'en', value: 'Contact Information', isCustom: false, tenantId: null },
  { domain: 'booking', key: 'specialRequests', locale: 'en', value: 'Special Requests', isCustom: false, tenantId: null },
  { domain: 'booking', key: 'selectStaff', locale: 'en', value: 'Select Staff', isCustom: false, tenantId: null },
  { domain: 'booking', key: 'selectLocation', locale: 'en', value: 'Select Location', isCustom: false, tenantId: null },
  { domain: 'booking', key: 'addOn', locale: 'en', value: 'Add-On Services', isCustom: false, tenantId: null },
  { domain: 'booking', key: 'totalPrice', locale: 'en', value: 'Total Price', isCustom: false, tenantId: null },
  { domain: 'booking', key: 'discount', locale: 'en', value: 'Discount', isCustom: false, tenantId: null },
  { domain: 'booking', key: 'promoCode', locale: 'en', value: 'Promo Code', isCustom: false, tenantId: null },
  { domain: 'booking', key: 'paymentMethod', locale: 'en', value: 'Payment Method', isCustom: false, tenantId: null },
  { domain: 'booking', key: 'paymentStatus', locale: 'en', value: 'Payment Status', isCustom: false, tenantId: null },

  // ============================================================
  // 4. admin — 22 entries
  // ============================================================
  { domain: 'admin', key: 'dashboard.title', locale: 'en', value: 'Admin Dashboard', isCustom: false, tenantId: null },
  { domain: 'admin', key: 'dashboard.totalBookings', locale: 'en', value: 'Total Bookings', isCustom: false, tenantId: null },
  { domain: 'admin', key: 'dashboard.revenue', locale: 'en', value: 'Revenue', isCustom: false, tenantId: null },
  { domain: 'admin', key: 'dashboard.activeUsers', locale: 'en', value: 'Active Users', isCustom: false, tenantId: null },
  { domain: 'admin', key: 'dashboard.popularServices', locale: 'en', value: 'Popular Services', isCustom: false, tenantId: null },
  { domain: 'admin', key: 'dashboard.appointments', locale: 'en', value: 'Appointments', isCustom: false, tenantId: null },
  { domain: 'admin', key: 'dashboard.weeklyBookings', locale: 'en', value: 'Weekly Bookings', isCustom: false, tenantId: null },
  { domain: 'admin', key: 'dashboard.monthlyRevenue', locale: 'en', value: 'Monthly Revenue', isCustom: false, tenantId: null },
  { domain: 'admin', key: 'dashboard.topServices', locale: 'en', value: 'Top Services', isCustom: false, tenantId: null },
  { domain: 'admin', key: 'dashboard.recentBookings', locale: 'en', value: 'Recent Bookings', isCustom: false, tenantId: null },
  { domain: 'admin', key: 'sidebar.dashboard', locale: 'en', value: 'Dashboard', isCustom: false, tenantId: null },
  { domain: 'admin', key: 'sidebar.bookings', locale: 'en', value: 'Bookings', isCustom: false, tenantId: null },
  { domain: 'admin', key: 'sidebar.services', locale: 'en', value: 'Services', isCustom: false, tenantId: null },
  { domain: 'admin', key: 'sidebar.users', locale: 'en', value: 'Users', isCustom: false, tenantId: null },
  { domain: 'admin', key: 'sidebar.settings', locale: 'en', value: 'Settings', isCustom: false, tenantId: null },
  { domain: 'admin', key: 'sidebar.reports', locale: 'en', value: 'Reports', isCustom: false, tenantId: null },
  { domain: 'admin', key: 'sidebar.notifications', locale: 'en', value: 'Notifications', isCustom: false, tenantId: null },
  { domain: 'admin', key: 'sidebar.messages', locale: 'en', value: 'Messages', isCustom: false, tenantId: null },
  { domain: 'admin', key: 'sidebar.analytics', locale: 'en', value: 'Analytics', isCustom: false, tenantId: null },
  { domain: 'admin', key: 'sidebar.integrations', locale: 'en', value: 'Integrations', isCustom: false, tenantId: null },
  { domain: 'admin', key: 'sidebar.auditLog', locale: 'en', value: 'Audit Log', isCustom: false, tenantId: null },
  { domain: 'admin', key: 'sidebar.backup', locale: 'en', value: 'Backup', isCustom: false, tenantId: null },

  // ============================================================
  // 5. services — 16 entries
  // ============================================================
  { domain: 'services', key: 'name', locale: 'en', value: 'Service Name', isCustom: false, tenantId: null },
  { domain: 'services', key: 'description', locale: 'en', value: 'Description', isCustom: false, tenantId: null },
  { domain: 'services', key: 'duration', locale: 'en', value: 'Duration (minutes)', isCustom: false, tenantId: null },
  { domain: 'services', key: 'price', locale: 'en', value: 'Price', isCustom: false, tenantId: null },
  { domain: 'services', key: 'category', locale: 'en', value: 'Category', isCustom: false, tenantId: null },
  { domain: 'services', key: 'active', locale: 'en', value: 'Active', isCustom: false, tenantId: null },
  { domain: 'services', key: 'inactive', locale: 'en', value: 'Inactive', isCustom: false, tenantId: null },
  { domain: 'services', key: 'createService', locale: 'en', value: 'Create Service', isCustom: false, tenantId: null },
  { domain: 'services', key: 'editService', locale: 'en', value: 'Edit Service', isCustom: false, tenantId: null },
  { domain: 'services', key: 'deleteService', locale: 'en', value: 'Delete Service', isCustom: false, tenantId: null },
  { domain: 'services', key: 'serviceList', locale: 'en', value: 'Service List', isCustom: false, tenantId: null },
  { domain: 'services', key: 'serviceImage', locale: 'en', value: 'Service Image', isCustom: false, tenantId: null },
  { domain: 'services', key: 'serviceDescription', locale: 'en', value: 'Service Description', isCustom: false, tenantId: null },
  { domain: 'services', key: 'serviceCategory', locale: 'en', value: 'Service Category', isCustom: false, tenantId: null },
  { domain: 'services', key: 'serviceTags', locale: 'en', value: 'Tags', isCustom: false, tenantId: null },
  { domain: 'services', key: 'serviceStatus', locale: 'en', value: 'Status', isCustom: false, tenantId: null },

  // ============================================================
  // 6. timeSlots — 14 entries
  // ============================================================
  { domain: 'timeSlots', key: 'available', locale: 'en', value: 'Available', isCustom: false, tenantId: null },
  { domain: 'timeSlots', key: 'book', locale: 'en', value: 'Book', isCustom: false, tenantId: null },
  { domain: 'timeSlots', key: 'notAvailable', locale: 'en', value: 'Not Available', isCustom: false, tenantId: null },
  { domain: 'timeSlots', key: 'morning', locale: 'en', value: 'Morning', isCustom: false, tenantId: null },
  { domain: 'timeSlots', key: 'afternoon', locale: 'en', value: 'Afternoon', isCustom: false, tenantId: null },
  { domain: 'timeSlots', key: 'evening', locale: 'en', value: 'Evening', isCustom: false, tenantId: null },
  { domain: 'timeSlots', key: 'slotDuration', locale: 'en', value: 'Slot Duration', isCustom: false, tenantId: null },
  { domain: 'timeSlots', key: 'datePicker', locale: 'en', value: 'Select Date', isCustom: false, tenantId: null },
  { domain: 'timeSlots', key: 'timeRange', locale: 'en', value: 'Time Range', isCustom: false, tenantId: null },
  { domain: 'timeSlots', key: 'startTime', locale: 'en', value: 'Start Time', isCustom: false, tenantId: null },
  { domain: 'timeSlots', key: 'endTime', locale: 'en', value: 'End Time', isCustom: false, tenantId: null },
  { domain: 'timeSlots', key: 'breakTime', locale: 'en', value: 'Break Time', isCustom: false, tenantId: null },
  { domain: 'timeSlots', key: 'maxBookings', locale: 'en', value: 'Max Bookings Per Slot', isCustom: false, tenantId: null },
  { domain: 'timeSlots', key: 'timezone', locale: 'en', value: 'Timezone', isCustom: false, tenantId: null },

  // ============================================================
  // 7. appointments — 18 entries
  // ============================================================
  { domain: 'appointments', key: 'status.confirmed', locale: 'en', value: 'Confirmed', isCustom: false, tenantId: null },
  { domain: 'appointments', key: 'status.pending', locale: 'en', value: 'Pending', isCustom: false, tenantId: null },
  { domain: 'appointments', key: 'status.cancelled', locale: 'en', value: 'Cancelled', isCustom: false, tenantId: null },
  { domain: 'appointments', key: 'status.completed', locale: 'en', value: 'Completed', isCustom: false, tenantId: null },
  { domain: 'appointments', key: 'status.noShow', locale: 'en', value: 'No Show', isCustom: false, tenantId: null },
  { domain: 'appointments', key: 'status.scheduled', locale: 'en', value: 'Scheduled', isCustom: false, tenantId: null },
  { domain: 'appointments', key: 'status.inProgress', locale: 'en', value: 'In Progress', isCustom: false, tenantId: null },
  { domain: 'appointments', key: 'appointmentId', locale: 'en', value: 'Appointment ID', isCustom: false, tenantId: null },
  { domain: 'appointments', key: 'customer', locale: 'en', value: 'Customer', isCustom: false, tenantId: null },
  { domain: 'appointments', key: 'service', locale: 'en', value: 'Service', isCustom: false, tenantId: null },
  { domain: 'appointments', key: 'dateTime', locale: 'en', value: 'Date & Time', isCustom: false, tenantId: null },
  { domain: 'appointments', key: 'actions', locale: 'en', value: 'Actions', isCustom: false, tenantId: null },
  { domain: 'appointments', key: 'notes.addNotes', locale: 'en', value: 'Add Notes', isCustom: false, tenantId: null },
  { domain: 'appointments', key: 'notes.viewNotes', locale: 'en', value: 'View Notes', isCustom: false, tenantId: null },
  { domain: 'appointments', key: 'reminders.sendReminder', locale: 'en', value: 'Send Reminder', isCustom: false, tenantId: null },
  { domain: 'appointments', key: 'reminders.scheduleReminder', locale: 'en', value: 'Schedule Reminder', isCustom: false, tenantId: null },
  { domain: 'appointments', key: 'history.viewHistory', locale: 'en', value: 'View History', isCustom: false, tenantId: null },
  { domain: 'appointments', key: 'history.noHistory', locale: 'en', value: 'No history available', isCustom: false, tenantId: null },

  // ============================================================
  // 8. notifications — 12 entries
  // ============================================================
  { domain: 'notifications', key: 'title', locale: 'en', value: 'Notifications', isCustom: false, tenantId: null },
  { domain: 'notifications', key: 'markAsRead', locale: 'en', value: 'Mark as Read', isCustom: false, tenantId: null },
  { domain: 'notifications', key: 'noNotifications', locale: 'en', value: 'No notifications', isCustom: false, tenantId: null },
  { domain: 'notifications', key: 'newNotification', locale: 'en', value: 'New Notification', isCustom: false, tenantId: null },
  { domain: 'notifications', key: 'emailNotifications', locale: 'en', value: 'Email Notifications', isCustom: false, tenantId: null },
  { domain: 'notifications', key: 'smsNotifications', locale: 'en', value: 'SMS Notifications', isCustom: false, tenantId: null },
  { domain: 'notifications', key: 'pushNotifications', locale: 'en', value: 'Push Notifications', isCustom: false, tenantId: null },
  { domain: 'notifications', key: 'notificationSettings', locale: 'en', value: 'Notification Settings', isCustom: false, tenantId: null },
  { domain: 'notifications', key: 'notificationPreferences', locale: 'en', value: 'Notification Preferences', isCustom: false, tenantId: null },
  { domain: 'notifications', key: 'dailyDigest', locale: 'en', value: 'Daily Digest', isCustom: false, tenantId: null },
  { domain: 'notifications', key: 'weeklyReport', locale: 'en', value: 'Weekly Report', isCustom: false, tenantId: null },
  { domain: 'notifications', key: 'systemAlerts', locale: 'en', value: 'System Alerts', isCustom: false, tenantId: null },

  // ============================================================
  // 9. errors — 16 entries
  // ============================================================
  { domain: 'errors', key: 'general', locale: 'en', value: 'Something went wrong', isCustom: false, tenantId: null },
  { domain: 'errors', key: 'network', locale: 'en', value: 'Network error. Please check your connection.', isCustom: false, tenantId: null },
  { domain: 'errors', key: 'serverError', locale: 'en', value: 'Server error. Please try again later.', isCustom: false, tenantId: null },
  { domain: 'errors', key: 'notFound', locale: 'en', value: 'Page not found', isCustom: false, tenantId: null },
  { domain: 'errors', key: 'unauthorized', locale: 'en', value: 'Please sign in to continue', isCustom: false, tenantId: null },
  { domain: 'errors', key: 'forbidden', locale: 'en', value: 'You do not have permission', isCustom: false, tenantId: null },
  { domain: 'errors', key: 'validationError', locale: 'en', value: 'Please check your input', isCustom: false, tenantId: null },
  { domain: 'errors', key: 'sessionExpired', locale: 'en', value: 'Your session has expired', isCustom: false, tenantId: null },
  { domain: 'errors', key: 'tryAgain', locale: 'en', value: 'Please try again', isCustom: false, tenantId: null },
  { domain: 'errors', key: 'contactSupport', locale: 'en', value: 'Please contact support', isCustom: false, tenantId: null },
  { domain: 'errors', key: 'timeout', locale: 'en', value: 'Request timed out', isCustom: false, tenantId: null },
  { domain: 'errors', key: 'rateLimitExceeded', locale: 'en', value: 'Too many requests. Please slow down.', isCustom: false, tenantId: null },
  { domain: 'errors', key: 'invalidCredentials', locale: 'en', value: 'Invalid email or password', isCustom: false, tenantId: null },
  { domain: 'errors', key: 'accountLocked', locale: 'en', value: 'Account locked. Please contact support.', isCustom: false, tenantId: null },
  { domain: 'errors', key: 'missingRequiredField', locale: 'en', value: 'Please fill in all required fields', isCustom: false, tenantId: null },
  { domain: 'errors', key: 'dataConflict', locale: 'en', value: 'Data conflict. Please refresh and try again.', isCustom: false, tenantId: null },

  // ============================================================
  // 10. validation — 12 entries
  // ============================================================
  { domain: 'validation', key: 'required', locale: 'en', value: 'This field is required', isCustom: false, tenantId: null },
  { domain: 'validation', key: 'email', locale: 'en', value: 'Please enter a valid email address', isCustom: false, tenantId: null },
  { domain: 'validation', key: 'minLength', locale: 'en', value: 'Must be at least {min} characters', isCustom: false, tenantId: null },
  { domain: 'validation', key: 'maxLength', locale: 'en', value: 'Must be no more than {max} characters', isCustom: false, tenantId: null },
  { domain: 'validation', key: 'passwordMatch', locale: 'en', value: 'Passwords do not match', isCustom: false, tenantId: null },
  { domain: 'validation', key: 'invalidFormat', locale: 'en', value: 'Invalid format', isCustom: false, tenantId: null },
  { domain: 'validation', key: 'phoneNumber', locale: 'en', value: 'Please enter a valid phone number', isCustom: false, tenantId: null },
  { domain: 'validation', key: 'passwordStrength', locale: 'en', value: 'Password is too weak', isCustom: false, tenantId: null },
  { domain: 'validation', key: 'urlFormat', locale: 'en', value: 'Please enter a valid URL', isCustom: false, tenantId: null },
  { domain: 'validation', key: 'dateFormat', locale: 'en', value: 'Please enter a valid date', isCustom: false, tenantId: null },
  { domain: 'validation', key: 'numericRange', locale: 'en', value: 'Value is outside the allowed range', isCustom: false, tenantId: null },
  { domain: 'validation', key: 'fileSize', locale: 'en', value: 'File size exceeds the maximum limit', isCustom: false, tenantId: null },

  // ============================================================
  // 11. email — 16 entries
  // ============================================================
  { domain: 'email', key: 'welcome.subject', locale: 'en', value: 'Welcome to Our Service!', isCustom: false, tenantId: null },
  { domain: 'email', key: 'welcome.body', locale: 'en', value: 'Thank you for registering. We are excited to have you on board!', isCustom: false, tenantId: null },
  { domain: 'email', key: 'welcome.body.preheader', locale: 'en', value: 'Your account has been created successfully', isCustom: false, tenantId: null },
  { domain: 'email', key: 'resetPassword.subject', locale: 'en', value: 'Reset Your Password', isCustom: false, tenantId: null },
  { domain: 'email', key: 'resetPassword.body', locale: 'en', value: 'Click the link below to reset your password.', isCustom: false, tenantId: null },
  { domain: 'email', key: 'resetPassword.expiry', locale: 'en', value: 'This link will expire in 1 hour.', isCustom: false, tenantId: null },
  { domain: 'email', key: 'verificationCode.subject', locale: 'en', value: 'Your Verification Code', isCustom: false, tenantId: null },
  { domain: 'email', key: 'verificationCode.body', locale: 'en', value: 'Your verification code is: {code}', isCustom: false, tenantId: null },
  { domain: 'email', key: 'bookingConfirmation.subject', locale: 'en', value: 'Booking Confirmed', isCustom: false, tenantId: null },
  { domain: 'email', key: 'bookingConfirmation.body', locale: 'en', value: 'Your booking has been confirmed.', isCustom: false, tenantId: null },
  { domain: 'email', key: 'bookingConfirmation.summary', locale: 'en', value: 'Booking Summary', isCustom: false, tenantId: null },
  { domain: 'email', key: 'bookingReminder.subject', locale: 'en', value: 'Appointment Reminder', isCustom: false, tenantId: null },
  { domain: 'email', key: 'bookingReminder.body', locale: 'en', value: 'This is a reminder for your upcoming appointment.', isCustom: false, tenantId: null },
  { domain: 'email', key: 'bookingReminder.tomorrow', locale: 'en', value: 'You have an appointment tomorrow.', isCustom: false, tenantId: null },
  { domain: 'email', key: 'feedback.request', locale: 'en', value: 'We would love to hear your feedback!', isCustom: false, tenantId: null },
  { domain: 'email', key: 'feedback.subject', locale: 'en', value: 'Share Your Feedback', isCustom: false, tenantId: null },
];

// ============================================================
// Seed function
// ============================================================

/**
 * Seed default English translation records into the TranslationDictionary table.
 *
 * Uses createMany with skipDuplicates: true, making it safe to call
 * multiple times (idempotent).
 *
 * @param prisma - PrismaClient instance connected to the database
 */
export async function seedDefaultTranslations(
  prisma: PrismaClient,
): Promise<void> {
  // Delete existing default English seed records to ensure idempotency.
  // skipDuplicates: true does not work reliably with PostgreSQL when the
  // unique constraint includes a nullable column (tenantId), because
  // PostgreSQL treats NULL != NULL in unique constraint comparisons.
  await prisma.translationDictionary.deleteMany({
    where: { isCustom: false, locale: 'en' },
  });

  await prisma.translationDictionary.createMany({
    data: DEFAULT_TRANSLATIONS,
    skipDuplicates: true,
  });
}
