import { Component, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { MarketDataService } from '../../services/market-data.service';
import { ToastService } from '../../services/toast.service';
import { differenceInDays, parseISO, addMonths, addQuarters, addYears } from 'date-fns';
import { EquityInvestmentDto, TransactionDto } from '../../models/master-data';
import { AutocompleteComponent, AutocompleteItem } from '../shared/autocomplete.component';

@Component({
  selector: 'app-investments-sips',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, DecimalPipe, ReactiveFormsModule, AutocompleteComponent],
  templateUrl: './investments-sips.component.html',
  styles: []
})
export class InvestmentsSipsComponent {
  private fb = inject(FormBuilder);
  private dataService = inject(DataService);
  private marketDataService = inject(MarketDataService);
  private toastService = inject(ToastService);
  equityInvestments = this.dataService.equityInvestmentsState;

  stockSearchResults = signal<AutocompleteItem[]>([]);

  showForm = signal<boolean>(false);
  editingId = signal<number | null>(null);
  investForm: FormGroup;

  showHistoryId = signal<number | null>(null);
  showTransactionForm = signal<number | null>(null);
  transactionForm: FormGroup;

  constructor() {
    this.investForm = this.fb.group({
      type: ['SIP', Validators.required],
      isNewFund: [true],
      existingFundId: [''],
      name: ['', [Validators.required, Validators.minLength(3)]],
      amount: ['', [Validators.required, Validators.min(1)]],
      totalInvested: ['', [Validators.min(0)]],
      startDate: ['', Validators.required],
      nextDueDate: [''],
      frequency: ['Monthly'],
      status: ['Active', Validators.required],
      currentValue: [0],
      // Stock-specific fields
      units: ['', [Validators.min(0)]],
      buyPrice: ['', [Validators.min(0)]],
      currentUnitPrice: ['', [Validators.min(0)]]
    });

    this.transactionForm = this.fb.group({
      transactionDate: ['', Validators.required],
      transactionAmount: ['', [Validators.required, Validators.min(1)]],
      transactionUnits: ['', [Validators.required, Validators.min(0.001)]],
      transactionNav: ['', [Validators.required, Validators.min(0.01)]]
    });

    this.transactionForm.get('transactionUnits')?.valueChanges.subscribe(() => {
      this.updateTransactionAmount();
    });

    this.transactionForm.get('transactionNav')?.valueChanges.subscribe(() => {
      this.updateTransactionAmount();
    });

    this.investForm.get('type')?.valueChanges.subscribe(type => {
      const nextDue = this.investForm.get('nextDueDate');
      if (type === 'SIP') {
        nextDue?.setValidators([Validators.required]);
      } else {
        nextDue?.clearValidators();
      }
      nextDue?.updateValueAndValidity();
    });

    this.investForm.get('isNewFund')?.valueChanges.subscribe(isNew => {
      const name = this.investForm.get('name');
      const existing = this.investForm.get('existingFundId');
      if (isNew) {
        name?.setValidators([Validators.required]);
        existing?.clearValidators();
      } else {
        name?.clearValidators();
        existing?.setValidators([Validators.required]);
      }
      name?.updateValueAndValidity();
      existing?.updateValueAndValidity();
    });
  }

  toggleForm() {
    this.showForm.update(v => !v);
    if (!this.showForm()) {
      this.cancelEdit();
    }
  }

  cancelEdit() {
    this.editingId.set(null);
    this.investForm.reset({ type: 'SIP', isNewFund: true, status: 'Active', frequency: 'Monthly' });
  }

  startEdit(ei: EquityInvestmentDto) {
    this.editingId.set(ei.id);
    this.showForm.set(true);

    const start = ei.startDate ? ei.startDate.split('T')[0] : '';
    const next = ei.nextDueDate ? ei.nextDueDate.split('T')[0] : '';

    this.investForm.patchValue({
      type: ei.type,
      name: ei.name,
      amount: ei.amount,
      totalInvested: ei.principal,
      startDate: start,
      nextDueDate: next,
      frequency: ei.frequency || 'Monthly',
      status: ei.status,
      currentValue: ei.currentValue,
      units: ei.units || '',
      buyPrice: ei.buyPrice || '',
      currentUnitPrice: ei.currentUnitPrice || ''
    });
  }

  toggleHistory(id: number) {
    this.showHistoryId.set(this.showHistoryId() === id ? null : id);
  }

  toggleTransactionForm(id: number) {
    this.showTransactionForm.set(this.showTransactionForm() === id ? null : id);
    if (this.showTransactionForm() !== id) {
      this.transactionForm.reset();
    }
  }

  private updateTransactionAmount() {
    const units = parseFloat(this.transactionForm.get('transactionUnits')?.value || '0');
    const nav = parseFloat(this.transactionForm.get('transactionNav')?.value || '0');
    if (units > 0 && nav > 0) {
      const amount = units * nav;
      this.transactionForm.patchValue({ transactionAmount: amount }, { emitEvent: false });
    }
  }

  submitTransaction(investmentId: number) {
    if (this.transactionForm.valid) {
      const formVal = this.transactionForm.value;
      const units = parseFloat(formVal.transactionUnits);
      const nav = parseFloat(formVal.transactionNav);
      const calculatedAmount = units * nav;

      this.dataService.addTransaction(investmentId, {
        date: this.formatDateWithoutZ(formVal.transactionDate),
        amount: calculatedAmount,
        type: 'SIP',
        units,
        nav
      }).subscribe({
        next: () => {
          this.transactionForm.reset();
          this.showTransactionForm.set(null);
          this.toastService.showSuccess('Transaction added successfully');
        },
        error: (err: Error) => {
          console.error('Failed to add transaction:', err);
          this.toastService.showError('Failed to add transaction');
        }
      });
    } else {
      Object.keys(this.transactionForm.controls).forEach(key => {
        this.transactionForm.get(key)?.markAsTouched();
      });
    }
  }

  deleteInvestment(ei: EquityInvestmentDto) {
    if (confirm(`Are you sure you want to delete the investment in ${ei.name}?`)) {
      this.dataService.deleteEquityInvestment(ei.id).subscribe({
        next: () => {
          this.toastService.showSuccess('Investment deleted successfully');
        },
        error: (err: Error) => {
          console.error('Failed to delete investment:', err);
          this.toastService.showError('Failed to delete investment');
        }
      });
    }
  }

  onSubmit() {
    if (this.investForm.valid) {
      const formVal = this.investForm.value;

      if (!formVal.isNewFund && formVal.type === 'Lumpsum') {
        // Add Lumpsum to existing fund
        this.dataService.addTransaction(Number(formVal.existingFundId), {
          date: this.formatDateWithoutZ(formVal.startDate),
          amount: formVal.amount,
          type: 'Lumpsum'
        }).subscribe({
          next: () => {
            this.cancelEdit();
            this.showForm.set(false);
            this.toastService.showSuccess('Lumpsum added successfully');
          },
          error: (err: Error) => {
            console.error('Failed to add lumpsum:', err);
            this.toastService.showError('Failed to add lumpsum investment');
          }
        });
      } else {
        const id = this.editingId() ?? (Math.max(...this.equityInvestments().map(s => s.id), 0) + 1);
        const existing = this.equityInvestments().find(ei => ei.id === id);

        let principal: number;
        let currentValue: number;
        let amount: number;

        if (formVal.type === 'Stock') {
          const units = parseFloat(formVal.units) || 0;
          const buyPrice = parseFloat(formVal.buyPrice) || 0;
          const currentUnitPrice = parseFloat(formVal.currentUnitPrice) || 0;

          principal = units * buyPrice;
          currentValue = units * currentUnitPrice;
          amount = units;
        } else {
          principal = this.editingId() ? (formVal.totalInvested || existing?.principal || formVal.amount) : (formVal.totalInvested || formVal.amount);
          currentValue = formVal.currentValue || (this.editingId() ? existing?.currentValue : formVal.amount) || formVal.amount;
          amount = formVal.amount;
        }

        const payload: EquityInvestmentDto = {
          id,
          name: formVal.name,
          type: formVal.type,
          amount,
          principal,
          currentValue,
          startDate: this.formatDateWithoutZ(formVal.startDate),
          nextDueDate: formVal.nextDueDate ? this.formatDateWithoutZ(formVal.nextDueDate) : undefined,
          frequency: formVal.frequency,
          status: formVal.status,
          portfolioId: 1,
          transactions: this.editingId() ?
            (existing?.transactions || []) :
            [{ id: 1, date: this.formatDateWithoutZ(formVal.startDate), amount: formVal.amount, type: formVal.type as 'SIP' | 'Lumpsum' }],
          units: formVal.type === 'Stock' ? parseFloat(formVal.units) || 0 : undefined,
          buyPrice: formVal.type === 'Stock' ? parseFloat(formVal.buyPrice) || 0 : undefined,
          currentUnitPrice: formVal.type === 'Stock' ? parseFloat(formVal.currentUnitPrice) || 0 : undefined
        };

        const apiCall = this.editingId()
          ? this.dataService.updateEquityInvestment(id, payload)
          : this.dataService.createEquityInvestment(payload);

        apiCall.subscribe({
          next: () => {
            this.cancelEdit();
            this.showForm.set(false);
            this.toastService.showSuccess(this.editingId() ? 'Investment updated successfully' : 'Investment created successfully');
          },
          error: (err: Error) => {
            console.error('Failed to save investment:', err);
            this.toastService.showError('Failed to save investment');
          }
        });
      }
    } else {
      Object.keys(this.investForm.controls).forEach(key => {
        this.investForm.get(key)?.markAsTouched();
      });
    }
  }

  calculateCAGR(ei: EquityInvestmentDto): string {
    if (!ei.principal || !ei.currentValue || !ei.startDate) return '0.00%';
    const start = parseISO(ei.startDate);
    const end = new Date();
    const days = differenceInDays(end, start);
    const years = days / 365.25;
    if (years <= 0) return '0.00%';
    const ratio = ei.currentValue / ei.principal;
    const cagr = (Math.pow(ratio, 1 / years) - 1) * 100;
    return `${cagr.toFixed(2)}%`;
  }

  getCAGRColor(ei: EquityInvestmentDto): string {
    const cagrStr = this.calculateCAGR(ei);
    const cagr = parseFloat(cagrStr);
    return cagr < 0 ? 'text-danger-600' : 'text-brand-600';
  }

  getSIPAge(ei: EquityInvestmentDto): string {
    if (!ei.startDate) return '';
    const start = parseISO(ei.startDate);
    const end = new Date();
    const days = differenceInDays(end, start);
    if (days < 30) return `${days} days`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} months`;
    const years = Math.floor(days / 365);
    const remainingMonths = Math.floor((days % 365) / 30);
    return remainingMonths > 0 ? `${years}y ${remainingMonths}m` : `${years} years`;
  }

  getNextPayoutDate(ei: EquityInvestmentDto): Date | null {
    if (ei.type !== 'SIP' || !ei.nextDueDate || !ei.frequency) return null;

    const today = new Date();
    let nextDate = parseISO(ei.nextDueDate);

    while (nextDate < today) {
      if (ei.frequency === 'Monthly') {
        nextDate = addMonths(nextDate, 1);
      } else if (ei.frequency === 'Quarterly') {
        nextDate = addQuarters(nextDate, 1);
      } else if (ei.frequency === 'Yearly') {
        nextDate = addYears(nextDate, 1);
      }
    }

    return nextDate;
  }

  getAllTransactions(ei: EquityInvestmentDto): TransactionDto[] {
    return (ei.transactions || []).slice(0, 10).sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
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

  searchStocks(query: string): void {
    if (query.length < 2) {
      this.stockSearchResults.set([]);
      return;
    }

    this.marketDataService.searchAll(query).subscribe({
      next: (results) => {
        const items: AutocompleteItem[] = results.map(r => ({
          label: `${r.name} (${r.type})`,
          value: r,
          metadata: r.type === 'Stock' ? r.exchange : r.schemeCode
        }));
        this.stockSearchResults.set(items);
      },
      error: (err) => {
        console.error('Search failed:', err);
        this.toastService.showError('Failed to search stocks');
      }
    });
  }

  selectStock(item: AutocompleteItem): void {
    const stock = item.value;
    this.investForm.patchValue({
      name: stock.name,
      type: stock.type === 'Stock' ? 'Stock' : 'Lumpsum'
    });
    this.stockSearchResults.set([]);
  }
}
