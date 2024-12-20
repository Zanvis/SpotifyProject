import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JamSessionComponent } from './jam-session.component';

describe('JamSessionComponent', () => {
  let component: JamSessionComponent;
  let fixture: ComponentFixture<JamSessionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JamSessionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JamSessionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
