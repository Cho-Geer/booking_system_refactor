import { Component, ChangeDetectionStrategy } from '@angular/core';
import { AppButtonComponent } from '../../../../shared/components/atoms/app-button/app-button.component';

@Component({
  selector: 'app-quick-booking-form',
  standalone: true,
  imports: [AppButtonComponent],
  template: `
    <div class="sharp-card p-5 bg-card-bg">
      <h3 class="text-base font-bold text-text-primary mb-5">Quick Booking</h3>
      <form class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-text-secondary mb-1.5">Service</label>
          <select class="w-full px-3 py-2 rounded-lg border border-border-color bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent-green focus:ring-1 focus:ring-accent-green/30 transition-colors">
            <option value="">Select a service</option>
            <option value="haircut">Haircut</option>
            <option value="manicure">Manicure</option>
            <option value="pedicure">Pedicure</option>
            <option value="massage">Massage</option>
            <option value="facial">Facial</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-text-secondary mb-1.5">Customer Name</label>
          <input type="text" class="w-full px-3 py-2 rounded-lg border border-border-color bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent-green focus:ring-1 focus:ring-accent-green/30 transition-colors" placeholder="Enter customer name">
        </div>
        <div>
          <label class="block text-xs font-medium text-text-secondary mb-1.5">Phone Number</label>
          <input type="tel" class="w-full px-3 py-2 rounded-lg border border-border-color bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent-green focus:ring-1 focus:ring-accent-green/30 transition-colors" placeholder="Enter phone number">
        </div>
        <div>
          <label class="block text-xs font-medium text-text-secondary mb-1.5">Date</label>
          <input type="date" class="w-full px-3 py-2 rounded-lg border border-border-color bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent-green focus:ring-1 focus:ring-accent-green/30 transition-colors">
        </div>
        <div>
          <label class="block text-xs font-medium text-text-secondary mb-1.5">Time</label>
          <input type="time" class="w-full px-3 py-2 rounded-lg border border-border-color bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent-green focus:ring-1 focus:ring-accent-green/30 transition-colors">
        </div>
        <app-button type="submit" label="Create Booking" variant="primary" styleClass="w-full" />

      </form>
    </div>
  `,
  styles: [':host { display: block; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickBookingFormComponent {}
