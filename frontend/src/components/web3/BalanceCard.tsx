'use client';

import { useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { useTokenBalance, useTokenAllowance, usePermit2Allowance } from '@/hooks/useToken';
import { useDepositBalance } from '@/hooks/useTokenBank';
import { formatTokenAmount } from '@/lib/utils';

export function BalanceCard() {
  const { address } = useAccount();

  const { data: tokenBalance, isLoading: isLoadingToken } = useTokenBalance(address);
  const { data: depositBalance, isLoading: isLoadingDeposit } = useDepositBalance(address);
  const { data: allowance, isLoading: isLoadingAllowance } = useTokenAllowance(address);
  const { data: permit2Allowance } = usePermit2Allowance(address);
  const hasPermit2Allowance = permit2Allowance !== undefined && (permit2Allowance as bigint) > 0n;

  const [pulsing, setPulsing] = useState(false);
  const prevTokenBalance = useRef<string | undefined>(undefined);
  const prevDepositBalance = useRef<string | undefined>(undefined);

  // Detect balance changes and trigger pulse
  useEffect(() => {
    const currentToken = tokenBalance !== undefined ? tokenBalance.toString() : undefined;
    const currentDeposit = depositBalance !== undefined ? depositBalance.toString() : undefined;

    if (
      (prevTokenBalance.current !== undefined && prevTokenBalance.current !== currentToken) ||
      (prevDepositBalance.current !== undefined && prevDepositBalance.current !== currentDeposit)
    ) {
      setPulsing(true);
      const timer = setTimeout(() => setPulsing(false), 400);
      return () => clearTimeout(timer);
    }

    prevTokenBalance.current = currentToken;
    prevDepositBalance.current = currentDeposit;
  }, [tokenBalance, depositBalance]);

  if (!address) {
    return (
      <div className="card card-balance p-8 text-center">
        <div className="text-[var(--ink-muted)] text-sm mb-2">Connect your wallet to view balances</div>
        <div className="text-xs text-[var(--ink-muted)]/60">Click "Connect Wallet" in the top right</div>
      </div>
    );
  }

  return (
    <div className={`card card-balance p-8 ${pulsing ? 'animate-balance-pulse' : ''}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-[var(--ink-muted)]">Your Balances</h2>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--ink-green)] animate-pulse" />
          <span className="text-xs text-[var(--ink-muted)]">Connected</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Wallet Balance */}
        <div className="group">
          <div className="text-xs text-[var(--ink-muted)] uppercase tracking-wider mb-2">Wallet</div>
          <div className="font-mono text-3xl font-semibold text-[var(--ink)] group-hover:text-[var(--copper)] transition-colors">
            {isLoadingToken ? (
              <span className="text-[var(--ink-muted)]/40">—</span>
            ) : (
              formatTokenAmount(tokenBalance as bigint)
            )}
          </div>
          <div className="text-sm text-[var(--ink-muted)] mt-1">MTK</div>
        </div>

        {/* Deposit Balance */}
        <div className="group">
          <div className="text-xs text-[var(--ink-muted)] uppercase tracking-wider mb-2">Deposited</div>
          <div className="font-mono text-3xl font-semibold text-[var(--ink-green)] group-hover:text-[var(--copper)] transition-colors">
            {isLoadingDeposit ? (
              <span className="text-[var(--ink-muted)]/40">—</span>
            ) : (
              formatTokenAmount(depositBalance as bigint)
            )}
          </div>
          <div className="text-sm text-[var(--ink-muted)] mt-1">MTK</div>
        </div>

        {/* Allowance */}
        <div className="group">
          <div className="text-xs text-[var(--ink-muted)] uppercase tracking-wider mb-2">Allowance</div>
          <div className="font-mono text-3xl font-semibold text-[var(--ink)] group-hover:text-[var(--copper)] transition-colors">
            {isLoadingAllowance ? (
              <span className="text-[var(--ink-muted)]/40">—</span>
            ) : (
              formatTokenAmount(allowance as bigint)
            )}
          </div>
          <div className="text-sm text-[var(--ink-muted)] mt-1">MTK</div>
        </div>

        {/* Permit2 Status */}
        <div className="group">
          <div className="text-xs text-[var(--ink-muted)] uppercase tracking-wider mb-2">Permit2</div>
          <div className="font-mono text-3xl font-semibold group-hover:text-[var(--copper)] transition-colors">
            {hasPermit2Allowance ? (
              <span className="text-[var(--ink-green)]">Active</span>
            ) : (
              <span className="text-[var(--ink-muted)]/60">Inactive</span>
            )}
          </div>
          <div className="text-sm text-[var(--ink-muted)] mt-1">
            {hasPermit2Allowance ? 'Approved' : 'Not approved'}
          </div>
        </div>
      </div>
    </div>
  );
}
