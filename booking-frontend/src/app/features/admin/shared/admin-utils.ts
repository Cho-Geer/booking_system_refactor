import { BadgeStatus } from '../../../shared/components/atoms/app-badge/app-badge.component';
import { AppointmentStatus } from '../dto/admin.dto';

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function getInitialsBg(name: string): string {
  const colors = [
    'bg-accent-teal/30 text-accent-teal',
    'bg-accent-purple/30 text-accent-purple',
    'bg-accent-green/30 text-accent-green',
    'bg-accent-yellow/30 text-accent-yellow',
    'bg-accent-teal/30 text-accent-teal',
  ];
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export function mapStatus(status: AppointmentStatus): BadgeStatus {
  return status.toLowerCase() as BadgeStatus;
}
