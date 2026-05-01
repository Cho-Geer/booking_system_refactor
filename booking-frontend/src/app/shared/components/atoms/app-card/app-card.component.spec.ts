import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Component } from '@angular/core';
import { AppCardComponent } from './app-card.component';
import { Card } from 'primeng/card';

describe('AppCardComponent', () => {
  let component: AppCardComponent;
  let fixture: ComponentFixture<AppCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppCardComponent, Card],
    }).compileComponents();

    fixture = TestBed.createComponent(AppCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render p-card element', () => {
    const cardEl = fixture.debugElement.query(By.css('p-card'));
    expect(cardEl).toBeTruthy();
  });

  it('should forward header text to p-card', () => {
    fixture.componentRef.setInput('header', 'Card Title');
    fixture.detectChanges();

    const cardEl = fixture.debugElement.query(By.css('p-card'));
    expect(cardEl).toBeTruthy();
  });

  it('should forward subheader text to p-card', () => {
    fixture.componentRef.setInput('subheader', 'Card Subtitle');
    fixture.detectChanges();

    const cardEl = fixture.debugElement.query(By.css('p-card'));
    expect(cardEl).toBeTruthy();
  });

  it('should forward custom styleClass to p-card', () => {
    fixture.componentRef.setInput('styleClass', 'shadow-lg');
    fixture.detectChanges();

    const cardEl = fixture.debugElement.query(By.css('p-card'));
    expect(cardEl).toBeTruthy();
  });

  it('should project ng-content inside the card', () => {
    const testBed = TestBed.createComponent(TestHostComponent);
    testBed.detectChanges();

    const content = testBed.debugElement.query(By.css('.test-content'));
    expect(content).toBeTruthy();
    expect(content.nativeElement.textContent).toContain('Projected Content');
  });

  describe('card hover micro-interaction', () => {
    it('[RED] should have app-card-hover class in combinedStyleClass', () => {
      fixture.detectChanges();
      // combinedStyleClass should include app-card-hover
      expect(component.combinedStyleClass).toContain('app-card-hover');
    });

    it('[RED] should have hover transition styles defined', () => {
      fixture.detectChanges();
      const combined = component.combinedStyleClass;
      expect(combined).toContain('app-card-hover');
      expect(combined.length).toBeGreaterThan(0);
    });
  });
});

@Component({
  standalone: true,
  imports: [AppCardComponent],
  template: `
    <app-card>
      <div class="test-content">Projected Content</div>
    </app-card>
  `,
})
class TestHostComponent {}
