import { Token, Campaign, Transaction, InvestorProfile, PortfolioDataPoint } from './../types';

export const investorProfile: InvestorProfile = {
  id: 'inv_001',
  name: 'Alexander Reed',
  email: 'alex.reed@proton.me',
  walletAddress: '0x4A8f3C2d1E9b7F0a5D6c8B3e2A1f4C7d9E0b2F5a',
  tier: 'Accredited',
  kycStatus: 'Verified',
  joinDate: '2023-03-15',
  totalInvested: 82500,
  totalReturns: 34920,
  portfolioValue: 288830,
};

export const campaigns: Campaign[] = [
];

export const transactions: Transaction[] = [
  { id: 'tx_001', hash: '0xA1b2C3d4E5f6A7b8C9d0E1f2A3b4C5d6E7f8A9b0', type: 'Buy', tokenSymbol: 'GTE', tokenAmount: 3571, valueUSD: 15000, date: '2024-01-16', status: 'Confirmed', to: '0x4A8f3...5a' },
  { id: 'tx_002', hash: '0xB2c3D4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9B0c1', type: 'Buy', tokenSymbol: 'PVR', tokenAmount: 7458, valueUSD: 22000, date: '2023-06-02', status: 'Confirmed', to: '0x4A8f3...5a' },
  { id: 'tx_003', hash: '0xC3d4E5f6A7b8C9d0E1f2A3b4C5d6E7f8A9b0C1d2', type: 'Dividend', tokenSymbol: 'PVR', tokenAmount: 0, valueUSD: 2156, date: '2024-06-10', status: 'Confirmed' },
  { id: 'tx_004', hash: '0xD4e5F6a7B8c9D0e1F2a3B4c5D6e7F8a9B0c1D2e3', type: 'Buy', tokenSymbol: 'MCH', tokenAmount: 1082, valueUSD: 8500, date: '2024-04-02', status: 'Confirmed', to: '0x4A8f3...5a' },
  { id: 'tx_005', hash: '0xE5f6A7b8C9d0E1f2A3b4C5d6E7f8A9b0C1d2E3f4', type: 'Stake', tokenSymbol: 'AGF', tokenAmount: 500, valueUSD: 4550, date: '2024-05-15', status: 'Confirmed' },
  { id: 'tx_006', hash: '0xF6a7B8c9D0e1F2a3B4c5D6e7F8a9B0c1D2e3F4a5', type: 'Buy', tokenSymbol: 'AGF', tokenAmount: 1318, valueUSD: 12000, date: '2023-11-21', status: 'Confirmed', to: '0x4A8f3...5a' },
  { id: 'tx_007', hash: '0xA7b8C9d0E1f2A3b4C5d6E7f8A9b0C1d2E3f4A5b6', type: 'Buy', tokenSymbol: 'FBL', tokenAmount: 1463, valueUSD: 18000, date: '2024-02-11', status: 'Confirmed', to: '0x4A8f3...5a' },
  { id: 'tx_008', hash: '0xB8c9D0e1F2a3B4c5D6e7F8a9B0c1D2e3F4a5B6c7', type: 'Transfer', tokenSymbol: 'GTE', tokenAmount: 250, valueUSD: 1050, date: '2024-07-20', status: 'Confirmed', from: '0x4A8f3...5a', to: '0xF9a2B...3c' },
  { id: 'tx_009', hash: '0xC9d0E1f2A3b4C5d6E7f8A9b0C1d2E3f4A5b6C7d8', type: 'Dividend', tokenSymbol: 'AGF', tokenAmount: 0, valueUSD: 980, date: '2024-08-01', status: 'Confirmed' },
  { id: 'tx_010', hash: '0xD0e1F2a3B4c5D6e7F8a9B0c1D2e3F4a5B6c7D8e9', type: 'Buy', tokenSymbol: 'GTE', tokenAmount: 8929, valueUSD: 37500, date: '2024-03-05', status: 'Confirmed', to: '0x4A8f3...5a' },
  { id: 'tx_011', hash: '0xE1f2A3b4C5d6E7f8A9b0C1d2E3f4A5b6C7d8E9f0', type: 'Stake', tokenSymbol: 'FBL', tokenAmount: 200, valueUSD: 2460, date: '2024-09-01', status: 'Pending' },
  { id: 'tx_012', hash: '0xF2a3B4c5D6e7F8a9B0c1D2e3F4a5B6c7D8e9F0a1', type: 'Transfer', tokenSymbol: 'MCH', tokenAmount: 100, valueUSD: 785, date: '2024-09-12', status: 'Failed', from: '0x4A8f3...5a' },
  { id: 'tx_013', hash: '0xA3b4C5d6E7f8A9b0C1d2E3f4A5b6C7d8E9f0A1b2', type: 'Dividend', tokenSymbol: 'GTE', tokenAmount: 0, valueUSD: 1575, date: '2024-07-15', status: 'Confirmed' },
  { id: 'tx_014', hash: '0xB4c5D6e7F8a9B0c1D2e3F4a5B6c7D8e9F0a1B2c3', type: 'Buy', tokenSymbol: 'MCH', tokenAmount: 7118, valueUSD: 55875, date: '2024-01-30', status: 'Confirmed', to: '0x4A8f3...5a' },
  { id: 'tx_015', hash: '0xC5d6E7f8A9b0C1d2E3f4A5b6C7d8E9f0A1b2C3d4', type: 'Sell', tokenSymbol: 'PVR', tokenAmount: 500, valueUSD: 1475, date: '2024-08-25', status: 'Confirmed', from: '0x4A8f3...5a' },
];

export const portfolioHistory: PortfolioDataPoint[] = [
  { month: 'Sep', value: 145000 },
  { month: 'Oct', value: 162000 },
  { month: 'Nov', value: 158000 },
  { month: 'Dec', value: 175000 },
  { month: 'Jan', value: 190000 },
  { month: 'Feb', value: 188000 },
  { month: 'Mar', value: 210000 },
  { month: 'Apr', value: 225000 },
  { month: 'May', value: 218000 },
  { month: 'Jun', value: 248000 },
  { month: 'Jul', value: 265000 },
  { month: 'Aug', value: 288830 },
];
