import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ServicePopularityPanelComponent } from './service-popularity-panel.component';

describe('ServicePopularityPanelComponent', () => {
  let component: ServicePopularityPanelComponent;
  let fixture: ComponentFixture<ServicePopularityPanelComponent>;

  const mockServices = [
    { name: 'Haircut', percentage: 35, color: 'from-accent-green to-accent-green-dark' },
    { name: 'Massage', percentage: 25, color: 'from-accent-purple to-purple-800' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServicePopularityPanelComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ServicePopularityPanelComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('services', mockServices);
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());
  it('[Red] should display "Service Popularity" heading', () => {
    expect(fixture.nativeElement.textContent).toContain('Service Popularity');
  });
  it('[Red] should display service names', () => {
    expect(fixture.nativeElement.textContent).toContain('Haircut');
    expect(fixture.nativeElement.textContent).toContain('Massage');
  });
  it('[Red] should display percentages', () => {
    expect(fixture.nativeElement.textContent).toContain('35%');
    expect(fixture.nativeElement.textContent).toContain('25%');
  });
});
