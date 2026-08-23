import { Injectable, signal, effect, PLATFORM_ID, inject, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of } from 'rxjs';
import {
  AssetDto,
  LiabilityDto,
  PortfolioDto,
  EquityInvestmentDto,
  TransactionDto,
  UpcomingMaturityDto,
  HistoricalNetWorthDto,
  TargetAllocationDto,
  CurrentAllocationDto
} from '../models/master-data';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  private readonly KEYS = {
    ASSETS: 'wealth_assets',
    LIABILITIES: 'wealth_liabilities',
    EQUITY: 'wealth_equity',
    PORTFOLIO: 'wealth_portfolio'
  };

  // Signals for state
  portfolioState = signal<PortfolioDto>(this.load(this.KEYS.PORTFOLIO) || this.getEmptyPortfolio());
  assetsState = signal<AssetDto[]>(this.load(this.KEYS.ASSETS) || []);
  liabilitiesState = signal<LiabilityDto[]>(this.load(this.KEYS.LIABILITIES) || []);
  equityInvestmentsState = signal<EquityInvestmentDto[]>(this.load(this.KEYS.EQUITY) || []);
  maturitiesState = signal<UpcomingMaturityDto[]>([]);

  constructor() {
    // Persistence Effects
    if (this.isBrowser) {
      effect(() => localStorage.setItem(this.KEYS.ASSETS, JSON.stringify(this.assetsState())));
      effect(() => localStorage.setItem(this.KEYS.LIABILITIES, JSON.stringify(this.liabilitiesState())));
      effect(() => localStorage.setItem(this.KEYS.EQUITY, JSON.stringify(this.equityInvestmentsState())));
      effect(() => localStorage.setItem(this.KEYS.PORTFOLIO, JSON.stringify(this.portfolioState())));
    }

    // Initial cleanup of legacy/mock data
    this.recalculatePortfolio();
  }

  // Aggregate snapshot of all application state for export
  exportData() {
    return {
      exportedAt: new Date().toISOString(),
      version: 1,
      portfolio: this.portfolioState(),
      assets: this.assetsState(),
      liabilities: this.liabilitiesState(),
      equityInvestments: this.equityInvestmentsState(),
      maturities: this.maturitiesState()
    };
  }

  private load(key: string): any {
    if (!this.isBrowser) return null;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  // API placeholders
  getPortfolio(): Observable<PortfolioDto> { return of(this.portfolioState()); }
  getAssets(): Observable<AssetDto[]> { return of(this.assetsState()); }
  getLiabilities(): Observable<LiabilityDto[]> { return of(this.liabilitiesState()); }
  getEquityInvestments(): Observable<EquityInvestmentDto[]> { return of(this.equityInvestmentsState()); }
  getUpcomingMaturities(): Observable<UpcomingMaturityDto[]> { return of(this.maturitiesState()); }

  // Merged assets for Portfolio Manager view
  allAssets = computed(() => {
    const manualAssets = this.assetsState();
    const equityAssets: AssetDto[] = this.equityInvestmentsState().map(ei => ({
      id: ei.id,
      name: ei.name,
      category: 'Equity',
      principal: ei.principal,
      currentValue: ei.currentValue,
      investmentStartDate: ei.startDate,
      portfolioId:ei.portfolioId,
      returns:''
    }));
    return [...manualAssets, ...equityAssets];
  });

  // --- Asset Methods ---
  upsertAsset(asset: AssetDto) {
    this.liabilitiesState.update(libs => libs.filter(l => l.id !== asset.id));

    if (asset.category === 'Equity') {
      this.equityInvestmentsState.update(eis => {
        const index = eis.findIndex(ei => ei.id === asset.id);
        if (index > -1) {
          const updated = [...eis];
          updated[index] = {
            ...updated[index],
            name: asset.name,
            principal: asset.principal,
            currentValue: asset.currentValue
          };
          return updated;
        }
        return eis;
      });
      this.assetsState.update(assets => assets.filter(a => a.id !== asset.id));
    } else {
      this.equityInvestmentsState.update(eis => eis.filter(ei => ei.id !== asset.id));
      this.assetsState.update(assets => {
        const index = assets.findIndex(a => a.id === asset.id);
        if (index > -1) {
          const updated = [...assets];
          updated[index] = asset;
          return updated;
        }
        return [...assets, asset];
      });
    }
    this.recalculatePortfolio();
  }

  deleteAsset(id: number, category?: string) {
    if (category === 'Equity') {
      this.deleteEquityInvestment(id);
    } else {
      this.assetsState.update(assets => assets.filter(a => a.id !== id));
    }
    this.recalculatePortfolio();
  }

  // --- Liability Methods ---
  upsertLiability(liability: LiabilityDto) {
    this.assetsState.update(assets => assets.filter(a => a.id !== liability.id));
    this.equityInvestmentsState.update(eis => eis.filter(ei => ei.id !== liability.id));

    this.liabilitiesState.update(libs => {
      const index = libs.findIndex(l => l.id === liability.id);
      if (index > -1) {
        const updated = [...libs];
        updated[index] = liability;
        return updated;
      }
      return [...libs, liability];
    });
    this.recalculatePortfolio();
  }

  deleteLiability(id: number) {
    this.liabilitiesState.update(libs => libs.filter(l => l.id !== id));
    this.recalculatePortfolio();
  }

  // --- Equity Investment Methods ---
  upsertEquityInvestment(ei: EquityInvestmentDto) {
    this.equityInvestmentsState.update(eis => {
      const index = eis.findIndex(s => s.id === ei.id);
      if (index > -1) {
        const updated = [...eis];
        updated[index] = ei;
        return updated;
      }
      return [...eis, ei];
    });
    this.recalculatePortfolio();
  }

  addTransaction(eiId: number, transaction: Omit<TransactionDto, 'id'>) {
    this.equityInvestmentsState.update(eis => {
      const index = eis.findIndex(ei => ei.id === eiId);
      if (index > -1) {
        const updated = [...eis];
        const ei = { ...updated[index] };
        const newTransaction: TransactionDto = {
          ...transaction,
          id: Math.random().toString(36).substr(2, 9)
        };
        ei.transactions = [newTransaction, ...ei.transactions];
        ei.principal += transaction.amount;
        updated[index] = ei;
        return updated;
      }
      return eis;
    });
    this.recalculatePortfolio();
  }

  deleteEquityInvestment(id: number) {
    this.equityInvestmentsState.update(eis => eis.filter(s => s.id !== id));
    this.recalculatePortfolio();
  }

  private recalculatePortfolio() {
    const manualA = this.assetsState().reduce((sum, a) => sum + a.currentValue, 0);
    const equityA = this.equityInvestmentsState().reduce((sum, ei) => sum + ei.currentValue, 0);
    const totalA = manualA + equityA;
    const totalL = this.liabilitiesState().reduce((sum, l) => sum + l.currentValue, 0);
    const net = totalA - totalL;

    const cats: Record<string, number> = { Equity: 0, Debt: 0, Gold: 0, Cash: 0 };
    this.assetsState().forEach(a => {
      const c = (a.category === 'FD' || a.category === 'Bond') ? 'Debt' :
        (a.category === 'Gold') ? 'Gold' : 'Cash';
      cats[c] = (cats[c] || 0) + a.currentValue;
    });
    this.equityInvestmentsState().forEach(ei => {
      cats['Equity'] += ei.currentValue;
    });

    const total = Object.values(cats).reduce((a, b) => a + b, 0) || 1;
    const currentAllocation: CurrentAllocationDto = {
      Equity: Math.round((cats['Equity'] / total) * 100),
      Debt: Math.round((cats['Debt'] / total) * 100),
      Gold: Math.round((cats['Gold'] / total) * 100),
      Cash: Math.round((cats['Cash'] / total) * 100)
    };

    const currentMonth = new Date().toLocaleString('default', { month: 'short' });

    this.portfolioState.update(p => {
      // Clean up legacy mock data if it exists
      let history = p.historicalNetWorth.filter(h =>
        !['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          .includes(h.month) || h.value === net // Keep if it was updated with current net
      );

      const monthIndex = history.findIndex(h => h.month === currentMonth);

      if (monthIndex > -1) {
        history[monthIndex] = { ...history[monthIndex], value: net };
      } else {
        history.push({ month: currentMonth, value: net });
        // Keep only last 12 months
        if (history.length > 12) history.shift();
      }

      return {
        ...p,
        totalAssets: totalA,
        totalLiabilities: totalL,
        totalNetWorth: net,
        currentAllocation,
        historicalNetWorth: history
      };
    });
  }

  private getEmptyPortfolio(): PortfolioDto {
    return {
      totalNetWorth: 0,
      totalAssets: 0,
      totalLiabilities: 0,
      financialHealthScore: 0,
      historicalNetWorth: [], // Should be empty
      targetAllocation: { Equity: 50, Debt: 30, Gold: 10, Cash: 10 },
      currentAllocation: { Equity: 0, Debt: 0, Gold: 0, Cash: 0 }
    };
  }
}
