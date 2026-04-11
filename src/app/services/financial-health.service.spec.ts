import { TestBed } from '@angular/core/testing';

import { FinancialHealthService } from './financial-health.service';

describe('FinancialHealthService', () => {
  let service: FinancialHealthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FinancialHealthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
