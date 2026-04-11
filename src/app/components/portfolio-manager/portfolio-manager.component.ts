import { Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { DataService } from '../../services/data.service';
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

  assets = this.dataService.allAssets;
  liabilities = this.dataService.liabilitiesState;

  showForm = signal<boolean>(false);
  editingId = signal<number | null>(null);

  assetForm: FormGroup;

  entryType = signal<'Asset' | 'Liability'>('Asset');

  constructor() {
    this.assetForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      category: ['FD', Validators.required],
      principal: ['', [Validators.required, Validators.min(0)]],
      currentValue: ['', [Validators.required, Validators.min(0)]],
      investmentDate: ['', Validators.required],
      interestRate: [''],
      isSeniorCitizen: [false],
      maturityDate: ['']
    });

    this.assetForm.get('category')?.valueChanges.subscribe(cat => {
      const maturityControl = this.assetForm.get('maturityDate');
      if (cat === 'FD' || cat === 'Bond') {
        maturityControl?.setValidators([Validators.required]);
      } else {
        maturityControl?.clearValidators();
      }
      maturityControl?.updateValueAndValidity();
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

    const isLiability = item.category === 'Loan';
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
      maturityDate: mDate
    });
  }

  deleteItem(item: any) {
    if (confirm(`Are you sure you want to delete ${item.name}?`)) {
      if (item.category === 'Loan') {
        this.dataService.deleteLiability(item.id);
      } else {
        this.dataService.deleteAsset(item.id, item.category);
      }
    }
  }

  onSubmit() {
    if (this.assetForm.valid) {
      const formVal = this.assetForm.value;
      const id = this.editingId() ?? (Math.max(...this.assets().map(a => a.id), ...this.liabilities().map(l => l.id), 0) + 1);

      const payload = {
        id,
        ...formVal,
        investmentDate: new Date(formVal.investmentDate).toISOString(),
        maturityDate: formVal.maturityDate ? new Date(formVal.maturityDate).toISOString() : undefined
      };

      if (this.entryType() === 'Liability' || formVal.category === 'Loan') {
        this.dataService.upsertLiability(payload as LiabilityDto);
      } else {
        this.dataService.upsertAsset(payload as AssetDto);
      }

      this.cancelEdit();
      this.showForm.set(false);
    } else {
      Object.keys(this.assetForm.controls).forEach(key => {
        this.assetForm.get(key)?.markAsTouched();
      });
    }
  }
}
