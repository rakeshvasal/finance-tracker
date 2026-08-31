import { Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { DataService } from '../../services/data.service';
import { MarketDataService } from '../../services/market-data.service';
import { ToastService } from '../../services/toast.service';
import { AssetDto, LiabilityDto } from '../../models/master-data';

@Component({
  selector: 'app-portfolio-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './portfolio-manager.component.html',
  styles: []
})
export class PortfolioManagerComponent {
  private fb = inject(FormBuilder);
  private dataService = inject(DataService);
  private marketDataService = inject(MarketDataService);
  private toastService = inject(ToastService);

  assets = this.dataService.allAssets;
  liabilities = this.dataService.liabilitiesState;

  showForm = signal<boolean>(false);
  editingId = signal<number | null>(null);
  isSubmitting = signal<boolean>(false);
  isRecalculating = signal<boolean>(false);

  assetForm: FormGroup;

  entryType = signal<'Asset' | 'Liability'>('Asset');

  constructor() {
    this.assetForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      category: ['FD', Validators.required],
      principal: ['', [Validators.required, Validators.min(0)]],
      currentValue: [''],
      investmentDate: ['', Validators.required],
      interestRate: [''],
      isSeniorCitizen: [false],
      maturityDate: [''],
      payoutCycle: [''],
      remainingPeriod: [''],
      remainingMonths: [''],
      units: ['', [Validators.min(0)]],
      pricePerUnit: ['', [Validators.min(0)]]
    });

    this.assetForm.get('category')?.valueChanges.subscribe(cat => {
      const maturityControl = this.assetForm.get('maturityDate');
      const interestControl = this.assetForm.get('interestRate');
      const currentValueControl = this.assetForm.get('currentValue');
      const payoutControl = this.assetForm.get('payoutCycle');

      if (cat === 'FD' || cat === 'Bond') {
        maturityControl?.setValidators([Validators.required]);
        interestControl?.setValidators([Validators.required]);
        currentValueControl?.clearValidators();
      } else if (cat === 'Gold') {
        maturityControl?.clearValidators();
        interestControl?.clearValidators();
        currentValueControl?.clearValidators();
      } else if (cat === 'Home' || cat === 'Land') {
        maturityControl?.clearValidators();
        interestControl?.clearValidators();
        currentValueControl?.setValidators([Validators.required, Validators.min(0)]);
      } else {
        maturityControl?.clearValidators();
        interestControl?.clearValidators();
        currentValueControl?.setValidators([Validators.required, Validators.min(0)]);
      }

      if (cat === 'Bond') {
        payoutControl?.setValidators([Validators.required]);
      } else {
        payoutControl?.clearValidators();
      }

      maturityControl?.updateValueAndValidity();
      interestControl?.updateValueAndValidity();
      currentValueControl?.updateValueAndValidity();
      payoutControl?.updateValueAndValidity();
    });
  }

  get isDebtCategory(): boolean {
    const cat = this.assetForm.get('category')?.value;
    return cat === 'FD' || cat === 'Bond';
  }

  toggleForm() {
    this.showForm.update(v => !v);
    if (!this.showForm()) {
      this.cancelEdit();
    }
  }

  setEntryType(type: 'Asset' | 'Liability') {
    this.entryType.set(type);
    if (type === 'Liability') {
      this.assetForm.patchValue({ category: 'Loan' });
    } else {
      this.assetForm.patchValue({ category: 'FD' });
    }
  }

  cancelEdit() {
    this.editingId.set(null);
    this.assetForm.reset({ category: 'FD', isSeniorCitizen: false });
    this.entryType.set('Asset');
  }

  startEdit(item: any) {
    this.editingId.set(item.id);
    this.showForm.set(true);

    const isLiability = item.category === 'Loan' || item.category === 'Current' || item.category === 'Long-term' || item.category === 'Conditional';
    this.entryType.set(isLiability ? 'Liability' : 'Asset');

    const date = item.investmentDate ? item.investmentDate.split('T')[0] : '';
    const mDate = item.maturityDate ? item.maturityDate.split('T')[0] : '';

    this.assetForm.patchValue({
      name: item.name,
      category: item.category,
      principal: item.principal,
      currentValue: item.currentValue,
      investmentDate: date,
      interestRate: item.interestRate || '',
      isSeniorCitizen: item.isSeniorCitizen || false,
      maturityDate: mDate,
      payoutCycle: item.payoutCycle || '',
      remainingMonths: item.remainingMonths || '',
      units: item.units || '',
      pricePerUnit: item.pricePerUnit || ''
    });
  }

  private formatDateWithoutZ(dateString: string): string {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
  }

  deleteItem(item: any) {
    if (confirm(`Are you sure you want to delete ${item.name}?`)) {
      const isLiability = item.category === 'Loan' || item.category === 'Current' || item.category === 'Long-term' || item.category === 'Conditional';

      if (isLiability) {
        this.dataService.deleteLiability(item.id).subscribe({
          next: () => {
            this.toastService.showSuccess(`${item.name} deleted successfully`);
          },
          error: (err: any) => {
            console.error('Delete failed:', err);
            this.toastService.showError(`Failed to delete ${item.name}`);
          }
        });
      } else {
        this.dataService.deleteAsset(item.id, item.category).subscribe({
          next: () => {
            this.toastService.showSuccess(`${item.name} deleted successfully`);
          },
          error: (err: any) => {
            console.error('Delete failed:', err);
            this.toastService.showError(`Failed to delete ${item.name}`);
          }
        });
      }
    }
  }

  onSubmit() {
    if (this.assetForm.valid) {
      this.isSubmitting.set(true);
      const formVal = this.assetForm.value;
      const editingId = this.editingId();
      const id = editingId ?? (Math.max(...this.assets().map(a => a.id), ...this.liabilities().map(l => l.id), 0) + 1);

      const basePayload = {
        id,
        name: formVal.name,
        category: formVal.category,
        principal: formVal.principal,
        currentValue: formVal.currentValue || formVal.principal,
        investmentStartDate: this.formatDateWithoutZ(formVal.investmentDate),
        investmentDate: this.formatDateWithoutZ(formVal.investmentDate),
        interestRate: formVal.interestRate || 0,
        roi: formVal.interestRate || 0,
        maturityDate: formVal.maturityDate ? this.formatDateWithoutZ(formVal.maturityDate) : undefined,
        payoutCycle: formVal.payoutCycle || undefined,
        remainingMonths: formVal.remainingMonths || undefined,
        returns: formVal.payoutCycle || 'Annual',
        portfolioId: 1
      };

      if (this.entryType() === 'Liability') {
        const liabilityRequest = editingId
          ? this.dataService.updateLiability(editingId, basePayload as unknown as Partial<LiabilityDto>)
          : this.dataService.createLiability(basePayload as unknown as LiabilityDto);

        liabilityRequest.subscribe({
          next: () => {
            this.isSubmitting.set(false);
            this.toastService.showSuccess(
              `${this.entryType()} ${editingId ? 'updated' : 'created'} successfully`
            );
            this.cancelEdit();
            this.showForm.set(false);
          },
          error: (err: any) => {
            this.isSubmitting.set(false);
            console.error('Submit failed:', err);
            this.toastService.showError(`Failed to ${editingId ? 'update' : 'create'} ${this.entryType()}`);
          }
        });
      } else {
        const assetRequest = editingId
          ? this.dataService.updateAsset(editingId, basePayload as unknown as Partial<AssetDto>)
          : this.dataService.createAsset(basePayload as unknown as AssetDto);

        assetRequest.subscribe({
          next: () => {
            this.isSubmitting.set(false);
            this.toastService.showSuccess(
              `${this.entryType()} ${editingId ? 'updated' : 'created'} successfully`
            );
            this.cancelEdit();
            this.showForm.set(false);
          },
          error: (err: any) => {
            this.isSubmitting.set(false);
            console.error('Submit failed:', err);
            this.toastService.showError(`Failed to ${editingId ? 'update' : 'create'} ${this.entryType()}`);
          }
        });
      }
    } else {
      Object.keys(this.assetForm.controls).forEach(key => {
        this.assetForm.get(key)?.markAsTouched();
      });
    }
  }

  getAssetGain(asset: AssetDto): string {
    const gain = asset.currentValue - asset.principal;
    return asset.currentValue >= asset.principal ? `+${gain.toFixed(0)}` : `${gain.toFixed(0)}`;
  }

  getAssetGainPercent(asset: AssetDto): string {
    if (!asset.principal) return '0.0%';
    const percent = ((asset.currentValue - asset.principal) / asset.principal) * 100;
    return asset.currentValue >= asset.principal ? `+${percent.toFixed(1)}%` : `${percent.toFixed(1)}%`;
  }

  getAssetReturnLabel(category: string): string {
    switch (category) {
      case 'Equity':
        return 'Appreciation';
      case 'Gold':
        return 'Appreciation';
      case 'Home':
      case 'Land':
        return 'Appreciation';
      case 'FD':
      case 'Bond':
        return 'Interest Earned';
      default:
        return 'Return';
    }
  }

  getLiabilityOutstanding(liability: LiabilityDto): number {
    return liability.currentValue;
  }

  getLiabilityStatus(liability: LiabilityDto): string {
    if (liability.currentValue <= 0) return 'Closed';
    if (liability.currentValue < liability.principal * 0.25) return 'Nearly Paid';
    return 'Active';
  }

  calculateEMI(principal: number, ratePercent: number, months: number): number {
    if (!principal || !ratePercent || !months || months <= 0) return 0;
    const monthlyRate = ratePercent / 100 / 12;
    if (monthlyRate === 0) return principal / months;
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
                (Math.pow(1 + monthlyRate, months) - 1);
    return Math.round(emi);
  }

  refreshPrices() {
    this.marketDataService.refreshAllPrices(1).subscribe({
      next: () => {
        this.dataService.getAssets().subscribe();
        this.dataService.getEquityInvestments().subscribe();
        this.toastService.showSuccess('Prices refreshed successfully');
      },
      error: (err: any) => {
        console.error('Refresh failed:', err);
        this.toastService.showError('Failed to refresh prices');
      }
    });
  }

  recalculatePortfolio() {
    this.isRecalculating.set(true);
    this.dataService.recalculatePortfolio().subscribe({
      next: (response: any) => {
        this.isRecalculating.set(false);
        const message = response?._message || 'Portfolio recalculated successfully';
        this.toastService.showSuccess(message);
      },
      error: (err: any) => {
        this.isRecalculating.set(false);
        console.error('Recalculation failed:', err);
        this.toastService.showError('Failed to recalculate portfolio');
      }
    });
  }
}
