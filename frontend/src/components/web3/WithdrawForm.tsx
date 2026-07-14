'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useWithdraw } from '@/hooks/useTokenBank';
import { isUserRejectedError } from '@/lib/utils';
import { useToast } from '@/components/web3/Toast';

export function WithdrawForm() {
  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const { addToast } = useToast();

  const { withdraw, isPending, isConfirming, isSuccess, error, reset } = useWithdraw();

  const shownSuccess = useRef(false);

  // Handle withdraw success
  useEffect(() => {
    if (isSuccess && !shownSuccess.current) {
      shownSuccess.current = true;
      addToast('success', 'Withdrawn successfully');
      setAmount('');
      const timer = setTimeout(() => reset(), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, addToast, reset]);

  // Handle errors (silent for user rejected)
  useEffect(() => {
    if (error && !isUserRejectedError(error)) {
      addToast('error', 'Withdrawal failed');
      reset();
    }
  }, [error, addToast, reset]);

  // Reset success tracking when new tx starts
  useEffect(() => {
    if (isPending || isConfirming) shownSuccess.current = false;
  }, [isPending, isConfirming]);

  const handleWithdraw = () => {
    if (!amount || isNaN(Number(amount))) return;
    withdraw(amount);
  };

  if (!address) return null;

  const isProcessing = isPending || isConfirming;

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-1 h-6 rounded-full bg-[var(--accent-amber)]" />
        <h2 className="text-lg font-semibold">Withdraw</h2>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">
            Amount (MTK)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            disabled={isProcessing}
            className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] font-mono text-lg placeholder:text-[var(--text-muted)]/30 disabled:opacity-50"
          />
        </div>

        <button
          onClick={handleWithdraw}
          disabled={!amount || isPending || isConfirming}
          className="w-full bg-[var(--accent-amber)] text-white py-3 px-4 rounded-lg font-medium hover:bg-[var(--accent-amber)]/90 disabled:bg-[var(--bg-elevated)] disabled:text-[var(--text-muted)] flex items-center justify-center gap-2"
        >
          {isConfirming ? (
            <>
              <Spinner /> Confirming
            </>
          ) : isPending ? (
            <>
              <Spinner /> Pending
            </>
          ) : (
            'Withdraw'
          )}
        </button>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
