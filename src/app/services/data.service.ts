import { Injectable, signal, inject, computed } from '@angular/core';
import { Observable, of, tap, catchError } from 'rxjs';
import {
  AssetDto,
  LiabilityDto,
  PortfolioDto,
  EquityInvestmentDto,
  TransactionDto,
  UpcomingMaturityDto
} from '../models/master-data';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private api = inject(ApiService);

  portfolioState = signal<PortfolioDto>(this.getEmptyPortfolio());
  assetsState = signal<AssetDto[]>([]);
  liabilitiesState = signal<LiabilityDto[]>([]);
  equityInvestmentsState = signal<EquityInvestmentDto[]>([]);
  maturitiesState = signal<UpcomingMaturityDto[]>([]);
  isInitialized = signal(false);

  constructor() {
    this.initializeData();
  }

  private initializeData() {
    Promise.all([
      this.getPortfolio().toPromise(),
      this.getAssets().toPromise(),
      this.getLiabilities().toPromise(),
      this.getEquityInvestments().toPromise()
    ]).then(() => {
      this.isInitialized.set(true);
    }).catch(err => {
      console.error('Error initializing data:', err);
      this.isInitialized.set(true);
    });
  }

  // API Methods - Always fetch from backend API
  getPortfolio(): Observable<PortfolioDto> {
    return this.api.get<PortfolioDto>('/portfolio')
      .pipe(tap(data => this.portfolioState.set(data)),
            catchError(err => {
              console.error('Failed to fetch portfolio', err);
              return of(this.portfolioState());
            }));
  }

  getAssets(): Observable<AssetDto[]> {
    return this.api.get<AssetDto[]>('/assets')
      .pipe(tap(data => this.assetsState.set(data)),
            catchError(err => {
              console.error('Failed to fetch assets', err);
              return of(this.assetsState());
            }));
  }

  getLiabilities(): Observable<LiabilityDto[]> {
    return this.api.get<LiabilityDto[]>('/liabilities')
      .pipe(tap(data => this.liabilitiesState.set(data)),
            catchError(err => {
              console.error('Failed to fetch liabilities', err);
              return of(this.liabilitiesState());
            }));
  }

  getEquityInvestments(): Observable<EquityInvestmentDto[]> {
    return this.api.get<EquityInvestmentDto[]>('/investments')
      .pipe(tap(data => this.equityInvestmentsState.set(data)),
            catchError(err => {
              console.error('Failed to fetch investments', err);
              return of(this.equityInvestmentsState());
            }));
  }

  getUpcomingMaturities(): Observable<UpcomingMaturityDto[]> {
    return this.api.get<UpcomingMaturityDto[]>('/maturities')
      .pipe(tap(data => this.maturitiesState.set(data)),
            catchError(err => {
              console.error('Failed to fetch maturities', err);
              return of(this.maturitiesState());
            }));
  }

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
  }

  deleteAsset(id: number, category?: string) {
    if (category === 'Equity') {
      this.deleteEquityInvestment(id);
    } else {
      this.assetsState.update(assets => assets.filter(a => a.id !== id));
    }
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
  }

  deleteLiability(id: number) {
    this.liabilitiesState.update(libs => libs.filter(l => l.id !== id));
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
  }

  deleteEquityInvestment(id: number) {
    this.equityInvestmentsState.update(eis => eis.filter(s => s.id !== id));
  }

  // Export and Import
  exportData(): Observable<any> {
    const data = {
      exportedAt: new Date().toISOString(),
      version: 1,
      portfolio: this.portfolioState(),
      assets: this.assetsState(),
      liabilities: this.liabilitiesState(),
      equityInvestments: this.equityInvestmentsState(),
      maturities: this.maturitiesState()
    };
    return of(data);
  }

  importData(data: any): Observable<any> {
    if (data.portfolio) this.portfolioState.set(data.portfolio);
    if (data.assets) this.assetsState.set(data.assets);
    if (data.liabilities) this.liabilitiesState.set(data.liabilities);
    if (data.equityInvestments) this.equityInvestmentsState.set(data.equityInvestments);
    if (data.maturities) this.maturitiesState.set(data.maturities);
    return of({ success: true });
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
