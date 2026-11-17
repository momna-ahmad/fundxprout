import { Token } from '@/types';

export function calculateUserEquity(token: Token): number | null {
  const fundingGoalEth = Number(token.fundingGoal) || 0;
  const balance = Number(token.balance) || 0;
  const tokenPriceEth = Number(token.pricePerToken) || 0;

  if (fundingGoalEth <= 0 || balance <= 0 || tokenPriceEth <= 0) return null;

  // The funding goal represents 100% of the equity basis in this model.
  // Use the investor's current token balance, so marketplace sales reduce ownership.
  return Number(((balance * tokenPriceEth / fundingGoalEth) * 100).toFixed(4));
}
