import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { AppTableWrapperComponent } from './app-table-wrapper.component';

@Component({
  template: `<app-table-wrapper><span class="test-content">Table</span></app-table-wrapper>`,
  imports: [AppTableWrapperComponent],
})
class TestHostComponent {}

describe('AppTableWrapperComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppTableWrapperComponent, TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    const host = fixture.debugElement.query(By.directive(AppTableWrapperComponent));
    expect(host).toBeTruthy();
  });

  it('should transclude content', () => {
    const content = fixture.debugElement.query(By.css('.test-content'));
    expect(content).toBeTruthy();
    expect(content.nativeElement.textContent).toBe('Table');
  });

  it('should have card-lift class and should NOT have overflow-hidden (allows paginator dropdown to overflow)', () => {
    const wrapper = fixture.debugElement.query(By.css('div'));
    expect(wrapper).toBeTruthy();
    const classList = wrapper.nativeElement.classList;
    expect(classList.contains('card-lift')).toBe(true);
    expect(classList.contains('overflow-hidden')).toBe(false);
  });
});
