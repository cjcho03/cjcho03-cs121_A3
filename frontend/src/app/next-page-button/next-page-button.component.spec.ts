import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NextPageButtonComponent } from './next-page-button.component';

describe('NextPageButtonComponent', () => {
  let component: NextPageButtonComponent;
  let fixture: ComponentFixture<NextPageButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NextPageButtonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NextPageButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
