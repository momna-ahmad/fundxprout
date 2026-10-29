import { Token } from '@/types';

export function calculateUserEquity(token: Token): number {
  // The campaign's funding goal is allocated across its offered equity.
  const fundingGoalEth = Number(token.fundingGoal) || 0;
  const equityOfferedPct = Number(token.equityOffered) || 0;
  const balance = Number(token.balance) || 0;
  const tokenPriceEth = Number(token.pricePerToken) || 0;

  if (fundingGoalEth <= 0 || equityOfferedPct <= 0 || balance <= 0 || tokenPriceEth <= 0) return 0;

  const offeredTokenSupply = fundingGoalEth / tokenPriceEth;
  return Number(((balance / offeredTokenSupply) * equityOfferedPct).toFixed(4));
}
