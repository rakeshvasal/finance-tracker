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
      .pipe(
        tap(data => {
          const mappedData = data.map(investment => this.mapInvestmentData(investment));
          this.equityInvestmentsState.set(mappedData);
        }),
        catchError(err => {
          console.error('Failed to fetch investments', err);
          return of(this.equityInvestmentsState());
        })
      );
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
  createAsset(asset: AssetDto): Observable<AssetDto> {
    return this.api.post<AssetDto>('/assets', asset)
      .pipe(
        tap(created => this.upsertAsset(created)),
        catchError(err => {
          console.error('Failed to create asset', err);
          throw err;
        })
      );
  }

  updateAsset(id: number, asset: Partial<AssetDto>): Observable<AssetDto> {
    return this.api.put<AssetDto>(`/assets/${id}`, asset)
      .pipe(
        tap(updated => this.upsertAsset(updated)),
        catchError(err => {
          console.error('Failed to update asset', err);
          throw err;
        })
      );
  }

  deleteAsset(id: number, category?: string): Observable<void> {
    return this.api.delete<void>(`/assets/${id}`)
      .pipe(
        tap(() => {
          if (category === 'Equity') {
            this.deleteEquityInvestmentLocal(id);
          } else {
            this.assetsState.update(assets => assets.filter(a => a.id !== id));
          }
        }),
        catchError(err => {
          console.error('Failed to delete asset', err);
          throw err;
        })
      );
  }

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

  // --- Liability Methods ---
  createLiability(liability: LiabilityDto): Observable<LiabilityDto> {
    return this.api.post<LiabilityDto>('/liabilities', liability)
      .pipe(
        tap(created => this.upsertLiability(created)),
        catchError(err => {
          console.error('Failed to create liability', err);
          throw err;
        })
      );
  }

  updateLiability(id: number, liability: Partial<LiabilityDto>): Observable<LiabilityDto> {
    return this.api.put<LiabilityDto>(`/liabilities/${id}`, liability)
      .pipe(
        tap(updated => this.upsertLiability(updated)),
        catchError(err => {
          console.error('Failed to update liability', err);
          throw err;
        })
      );
  }

  deleteLiability(id: number): Observable<void> {
    return this.api.delete<void>(`/liabilities/${id}`)
      .pipe(
        tap(() => this.liabilitiesState.update(libs => libs.filter(l => l.id !== id))),
        catchError(err => {
          console.error('Failed to delete liability', err);
          throw err;
        })
      );
  }

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

  // --- Equity Investment Methods ---
  createEquityInvestment(ei: EquityInvestmentDto): Observable<EquityInvestmentDto> {
    return this.api.post<EquityInvestmentDto>('/investments', ei)
      .pipe(
        tap(created => this.upsertEquityInvestment(created)),
        catchError(err => {
          console.error('Failed to create investment', err);
          throw err;
        })
      );
  }

  updateEquityInvestment(id: number, ei: Partial<EquityInvestmentDto>): Observable<EquityInvestmentDto> {
    return this.api.put<EquityInvestmentDto>(`/investments/${id}`, ei)
      .pipe(
        tap(updated => this.upsertEquityInvestment(updated)),
        catchError(err => {
          console.error('Failed to update investment', err);
          throw err;
        })
      );
  }

  deleteEquityInvestment(id: number): Observable<void> {
    return this.api.delete<void>(`/investments/${id}`)
      .pipe(
        tap(() => this.deleteEquityInvestmentLocal(id)),
        catchError(err => {
          console.error('Failed to delete investment', err);
          throw err;
        })
      );
  }

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

  private deleteEquityInvestmentLocal(id: number) {
    this.equityInvestmentsState.update(eis => eis.filter(s => s.id !== id));
  }

  addTransaction(eiId: number, transaction: Omit<TransactionDto, 'id'>): Observable<EquityInvestmentDto> {
    return this.api.post<EquityInvestmentDto>(`/investments/${eiId}/transactions`, transaction)
      .pipe(
        tap(updated => this.upsertEquityInvestment(updated)),
        catchError(err => {
          console.error('Failed to add transaction', err);
          throw err;
        })
      );
  }

  // --- Portfolio Methods ---
  recalculatePortfolio(): Observable<PortfolioDto> {
    return this.api.post<PortfolioDto>('/portfolio/recalculate', {})
      .pipe(
        tap(updated => this.portfolioState.set(updated)),
        catchError(err => {
          console.error('Failed to recalculate portfolio', err);
          throw err;
        })
      );
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


  private mapInvestmentData(investment: EquityInvestmentDto): EquityInvestmentDto {
    if (investment.schemeName && !investment.name) {
      return {
        ...investment,
        name: investment.schemeName
      };
    }
    return investment;
  }

  private getEmptyPortfolio(): PortfolioDto {
    return {
      id: 1,
      totalNetWorth: 0,
      totalAssets: 0,
      totalLiabilities: 0,
      financialHealthScore: 0,
      historicalNetWorth: [],
      targetAllocation: { Equity: 50, Debt: 30, Gold: 10, Cash: 10 },
      currentAllocation: { Equity: 0, Debt: 0, Gold: 0, Cash: 0 }
    };
  }
}
