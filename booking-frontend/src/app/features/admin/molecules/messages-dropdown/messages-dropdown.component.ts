import { Component, input, model, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

export interface MessageItem {
  id: string;
  senderName: string;
  subject: string;
  body: string;
  createdAt: string;
}

@Component({
  selector: 'app-messages-dropdown',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './messages-dropdown.component.html',
  styleUrl: './messages-dropdown.component.scss',
})
export class MessagesDropdownComponent {
  readonly messages = input<MessageItem[]>([]);
  readonly messageCount = model<number>(0);
  readonly dropdownOpen = signal(false);

  toggleDropdown(): void {
    this.dropdownOpen.update(v => !v);
  }

  closeDropdown(): void {
    this.dropdownOpen.set(false);
  }
}
