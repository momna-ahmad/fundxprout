export interface Token {
  id: string;
  name: string;
  symbol: string;
  contractAddress: string;
  balance: number;
  price: number;
  value: number;
  change24h: number;
  priceHistory: number[];
  campaignId: string;
  color: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  industry: 'Energy' | 'Real Estate' | 'Healthcare' | 'Agriculture' | 'Finance' | 'Infrastructure';
  investedAmount: number;
  tokenAmount: number;
  tokenSymbol: string;
  fundedPercent: number;
  totalTarget: number;
  roi: number;
  status: 'Active' | 'Completed' | 'Pending';
  startDate: string;
  endDate?: string;
}

export interface Transaction {
  id: string;
  hash: string;
  type: 'Buy' | 'Transfer' | 'Stake' | 'Dividend' | 'Sell';
  tokenSymbol: string;
  tokenAmount: number;
  valueUSD: number;
  date: string;
  status: 'Confirmed' | 'Pending' | 'Failed';
  from?: string;
  to?: string;
}

export interface InvestorProfile {
  id: string;
  name: string;
  email: string;
  walletAddress: string;
  tier: 'Retail' | 'Accredited' | 'Institutional';
  kycStatus: 'Verified' | 'Pending' | 'Not Started';
  joinDate: string;
  totalInvested: number;
  totalReturns: number;
  portfolioValue: number;
}

export interface PortfolioDataPoint {
  month: string;
  value: number;
}
