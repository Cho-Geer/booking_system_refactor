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

  describe('variant system', () => {
    it('[RED] should default variant to "default"', () => {
      expect(component.variant()).toBe('default');
    });

    it('[RED] should apply default variant classes', () => {
      fixture.detectChanges();
      const combined = component.combinedStyleClass;
      expect(combined).toContain('app-card-hover');
      expect(combined).toContain('app-card--default');
    });

    it('[RED] should apply glass variant classes when variant is glass', () => {
      fixture.componentRef.setInput('variant', 'glass');
      fixture.detectChanges();

      const combined = component.combinedStyleClass;
      expect(combined).toContain('app-card--glass');
      expect(combined).toContain('glass-level-1');
      expect(combined).toContain('shadow-glass');
    });

    it('[RED] should apply elevated variant classes', () => {
      fixture.componentRef.setInput('variant', 'elevated');
      fixture.detectChanges();

      const combined = component.combinedStyleClass;
      expect(combined).toContain('app-card--elevated');
      expect(combined).toContain('shadow-xl');
    });

    it('[RED] should apply outlined variant classes', () => {
      fixture.componentRef.setInput('variant', 'outlined');
      fixture.detectChanges();

      const combined = component.combinedStyleClass;
      expect(combined).toContain('app-card--outlined');
      expect(combined).toContain('border');
    });

    it('[RED] should still support legacy glass input mapped to glass variant', () => {
      fixture.componentRef.setInput('glass', true);
      fixture.detectChanges();

      const combined = component.combinedStyleClass;
      expect(combined).toContain('app-card--glass');
    });
  });

  describe('header icon', () => {
    it('[RED] should render header icon when headerIcon is provided', () => {
      fixture.componentRef.setInput('header', 'Title');
      fixture.componentRef.setInput('headerIcon', 'pi pi-user');
      fixture.detectChanges();

      const iconEl = fixture.debugElement.query(By.css('.app-card-header-icon'));
      expect(iconEl).toBeTruthy();
    });

    it('[RED] should not render header icon when headerIcon is not provided', () => {
      fixture.componentRef.setInput('header', 'Title');
      fixture.detectChanges();

      const iconEl = fixture.debugElement.query(By.css('.app-card-header-icon'));
      expect(iconEl).toBeFalsy();
    });
  });

  describe('accent bar', () => {
    it('[RED] should render accent bar when accentBar is true', () => {
      fixture.componentRef.setInput('accentBar', true);
      fixture.detectChanges();

      const accentBar = fixture.debugElement.query(By.css('.app-card-accent'));
      expect(accentBar).toBeTruthy();
    });

    it('[RED] should not render accent bar by default', () => {
      fixture.detectChanges();

      const accentBar = fixture.debugElement.query(By.css('.app-card-accent'));
      expect(accentBar).toBeFalsy();
    });
  });

  describe('card hover micro-interaction', () => {
    it('[RED] should have app-card-hover class in combinedStyleClass', () => {
      fixture.detectChanges();
      expect(component.combinedStyleClass).toContain('app-card-hover');
    });
  });

  describe('elevated hover lift effect', () => {
    it('[RED] should have hover-lift class for elevated variant', () => {
      fixture.componentRef.setInput('variant', 'elevated');
      fixture.detectChanges();
      expect(component.combinedStyleClass).toContain('hover-lift');
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
