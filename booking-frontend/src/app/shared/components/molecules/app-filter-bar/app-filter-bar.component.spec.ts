import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { AppFilterBarComponent } from './app-filter-bar.component';

@Component({
  template: `<app-filter-bar><span class="test-content">Hello</span></app-filter-bar>`,
  imports: [AppFilterBarComponent],
})
class TestHostComponent {}

describe('AppFilterBarComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppFilterBarComponent, TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    const host = fixture.debugElement.query(By.directive(AppFilterBarComponent));
    expect(host).toBeTruthy();
  });

  it('should transclude content', () => {
    const content = fixture.debugElement.query(By.css('.test-content'));
    expect(content).toBeTruthy();
    expect(content.nativeElement.textContent).toBe('Hello');
  });

  it('should have overflow visible on wrapper', () => {
    const wrapper = fixture.debugElement.query(By.css('.app-filter-bar-wrapper'));
    expect(wrapper).toBeTruthy();
    const classList = wrapper.nativeElement.classList;
    expect(classList.contains('card-lift')).toBe(true);
  });
});
