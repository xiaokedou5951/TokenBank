import { formatUnits, parseUnits } from 'viem';

export function formatTokenAmount(amount: bigint | undefined, decimals: number = 18): string {
  if (amount === undefined) return '0';
  return formatUnits(amount, decimals);
}

export function parseTokenAmount(amount: string, decimals: number = 18): bigint {
  return parseUnits(amount, decimals);
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
