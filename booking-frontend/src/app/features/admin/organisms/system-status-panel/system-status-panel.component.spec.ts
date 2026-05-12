import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SystemStatusPanelComponent } from './system-status-panel.component';

describe('SystemStatusPanelComponent', () => {
  let component: SystemStatusPanelComponent;
  let fixture: ComponentFixture<SystemStatusPanelComponent>;

  const mockStatusItems = [
    { label: 'Server', status: 'Online', color: 'text-accent-green' },
    { label: 'Database', status: 'Online', color: 'text-accent-green' },
    { label: 'API', status: 'Online', color: 'text-accent-green' },
    { label: 'Last Backup', status: 'Today, 02:15 AM', color: 'text-text-secondary' },
    { label: 'Uptime', status: '99.9%', color: 'text-text-secondary' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SystemStatusPanelComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(SystemStatusPanelComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('statusItems', mockStatusItems);
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());
  it('[Red] should display "System Status" heading', () => {
    expect(fixture.nativeElement.textContent).toContain('System Status');
  });
  it('[Red] should display status labels', () => {
    expect(fixture.nativeElement.textContent).toContain('Server');
    expect(fixture.nativeElement.textContent).toContain('Database');
    expect(fixture.nativeElement.textContent).toContain('API');
  });
  it('[Red] should display Online status with green dot', () => {
    const greenDot = fixture.nativeElement.querySelector('.bg-accent-green');
    expect(greenDot).toBeTruthy();
  });
  it('[Red] should display "99.9%" uptime', () => {
    expect(fixture.nativeElement.textContent).toContain('99.9%');
  });
});
