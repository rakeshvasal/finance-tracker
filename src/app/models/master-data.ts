export interface HistoricalNetWorthDto {
    month: string;
    value: number;
}

export interface TargetAllocationDto {
    Equity: number;
    Debt: number;
    Gold: number;
    Cash: number;
}

export interface CurrentAllocationDto {
    Equity: number;
    Debt: number;
    Gold: number;
    Cash: number;
}

export interface PortfolioDto {
    id: number;
    totalNetWorth: number;
    totalAssets: number;
    totalLiabilities: number;
    financialHealthScore: number;
    historicalNetWorth: HistoricalNetWorthDto[];
    targetAllocation: TargetAllocationDto;
    currentAllocation: CurrentAllocationDto;
}

export interface TransactionDto {
    id: number;
    date: string;
    amount: number;
    type: 'SIP' | 'Lumpsum';
    units?: number;
    nav?: number;
}

export interface EquityInvestmentDto {
    id: number;
    portfolioId: number;
    name: string;
    schemeCode?: string;
    schemeName?: string;
    type: 'SIP' | 'Lumpsum' | 'Stock';
    amount: number;
    principal: number;
    currentValue: number;
    startDate: string;
    nextDueDate?: string;
    frequency?: 'Monthly' | 'Quarterly' | 'Yearly';
    status: 'Active' | 'Failed' | 'Paused';
    transactions: TransactionDto[];
    // Stock-specific fields
    units?: number;
    buyPrice?: number;
    currentUnitPrice?: number;
    // Backend-calculated fields
    cagr?: number;
    absoluteReturns?: number;
    xirr?: number;
    sipAge?: string;
}

export interface AssetDto {
    id: number;
    name: string;
    category: 'FD' | 'Gold' | 'Home' | 'Land' | 'Bond' | 'Equity';
    principal: number;
    currentValue: number;
    investmentStartDate: string;
    ROI?: number;
    maturityDate?: string;
    portfolioId: number;
    returns: string;
    payoutCycle?: string;
    // Units field for unit-based assets
    units?: number;
    pricePerUnit?: number;
}

export interface LiabilityDto {
    id: number;
    name: string;
    category: 'Current' | 'Long-term' | 'Conditional' | 'Loan';
    principal: number;
    currentValue: number;
    investmentStartDate: string;
    ROI: number;
    portfolioId: number;
    remainingMonths?: number;
}

export interface UpcomingMaturityDto {
    id: number;
    name: string;
    type: string;
    amount: number;
    date: string;
}

export interface MasterDataDto {
    portfolio: PortfolioDto;
    assets: AssetDto[];
    liabilities: LiabilityDto[];
    equityInvestments: EquityInvestmentDto[];
    upcomingMaturities: UpcomingMaturityDto[];
}
