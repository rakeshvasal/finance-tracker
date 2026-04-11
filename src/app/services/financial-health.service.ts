import { Injectable, computed, inject } from '@angular/core';
import { DataService } from './data.service';

@Injectable({
  providedIn: 'root'
})
export class FinancialHealthService {
  private dataService = inject(DataService);

  // Computed signals derived from DataService state
  totalNetWorth = computed(() => this.dataService.portfolioState().totalNetWorth);
  totalAssets = computed(() => this.dataService.portfolioState().totalAssets);
  totalLiabilities = computed(() => this.dataService.portfolioState().totalLiabilities);
  financialHealthScore = computed(() => this.dataService.portfolioState().financialHealthScore);

  historicalNetWorth = computed(() => this.dataService.portfolioState().historicalNetWorth);
  targetAllocation = computed(() => this.dataService.portfolioState().targetAllocation);
  currentAllocation = computed(() => this.dataService.portfolioState().currentAllocation);

  constructor() { }

}
