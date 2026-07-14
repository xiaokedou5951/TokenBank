import { formatUnits, parseUnits } from 'viem';

export function formatTokenAmount(amount: bigint, decimals: number = 18): string {
  return formatUnits(amount, decimals);
}

export function parseTokenAmount(amount: string, decimals: number = 18): bigint {
  return parseUnits(amount, decimals);
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
