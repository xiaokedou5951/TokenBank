'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useWithdraw } from '@/hooks/useTokenBank';
import { isUserRejectedError, getContractErrorMessage } from '@/lib/utils';
import { useActivity } from '@/components/web3/ActivityLog';

export function WithdrawForm() {
  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const { addActivity, updateActivity } = useActivity();

  const {
    withdraw,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  } = useWithdraw();

  const [activityId, setActivityId] = useState<string | null>(null);
  const processedSuccess = useRef(false);

  const handleWithdraw = () => {
    if (!amount || isNaN(Number(amount))) return;
    const id = addActivity({ type: 'withdraw', status: 'pending', amount });
    setActivityId(id);
    processedSuccess.current = false;
    withdraw(amount);
  };

  // Update activity as it progresses
  useEffect(() => {
    if (!activityId) return;

    if (isConfirming && !isSuccess && !error) {
      updateActivity(activityId, { status: 'pending', message: 'Waiting for on-chain confirmation…' });
    }
  }, [isConfirming, isSuccess, error, activityId, updateActivity]);

  // Success / error resolution
  useEffect(() => {
    if (!activityId || processedSuccess.current) return;

    if (isSuccess) {
      processedSuccess.current = true;
      updateActivity(activityId, { status: 'success', message: 'Withdrawn from TokenBank', txHash: hash });
      setAmount('');
      setActivityId(null);
      const timer = setTimeout(() => reset(), 2000);
      return () => clearTimeout(timer);
    }

    if (error) {
      processedSuccess.current = true;
      if (isUserRejectedError(error)) {
        updateActivity(activityId, { status: 'error', message: 'Cancelled in wallet' });
      } else {
        updateActivity(activityId, { status: 'error', message: getContractErrorMessage(error) });
      }
      setActivityId(null);
      const timer = setTimeout(() => reset(), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, error, activityId, hash, updateActivity, reset]);

  // Reset tracker when a new transaction starts
  useEffect(() => {
    if (isPending || isConfirming) processedSuccess.current = false;
  }, [isPending, isConfirming]);

  if (!address) return null;

  const isProcessing = isPending || isConfirming;

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-1 h-6 rounded-full bg-[var(--copper)]" />
        <h2 className="text-lg font-semibold">Withdraw</h2>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-xs text-[var(--ink-muted)] uppercase tracking-wider mb-2">Amount (MTK)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            disabled={isProcessing}
            className="w-full px-4 py-3 bg-[var(--paper)] border border-[var(--border)] rounded-lg text-[var(--ink)] font-mono text-lg placeholder:text-[var(--ink-muted)]/40 disabled:opacity-50"
          />
        </div>

        <button
          onClick={handleWithdraw}
          disabled={!amount || isPending || isConfirming}
          className="w-full bg-[var(--copper)] text-white py-3 px-4 rounded-lg font-medium hover:bg-[var(--copper)]/90 disabled:bg-[var(--parchment)] disabled:text-[var(--ink-muted)] flex items-center justify-center gap-2"
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

        {/* Inline pending notice */}
        {isProcessing && (
          <div className="flex items-center gap-2 text-sm text-[var(--ink-muted)]">
            <Spinner />
            <span>Transaction in progress… Check the receipt panel for details.</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
