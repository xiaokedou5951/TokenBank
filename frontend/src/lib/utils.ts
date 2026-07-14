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

export function isUserRejectedError(error: Error | null): boolean {
  if (!error) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('user rejected') ||
    message.includes('user denied') ||
    message.includes('rejected by user') ||
    message.includes('action_rejected') ||
    (error as any).code === 4001 ||
    (error as any).code === 'ACTION_REJECTED'
  );
}
