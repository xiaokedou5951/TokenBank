'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useApprove, useTokenAllowance } from '@/hooks/useToken';
import { useDeposit } from '@/hooks/useTokenBank';
import { isUserRejectedError, getContractErrorMessage } from '@/lib/utils';
import { useActivity } from '@/components/web3/ActivityLog';
import { TOKENBANK_ADDRESS } from '@/lib/contracts';

export function DepositForm() {
  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const { addActivity, updateActivity } = useActivity();

  const {
    approve,
    hash: approveHash,
    isPending: isApproving,
    isConfirming: isApproveConfirming,
    isSuccess: approveSuccess,
    error: approveError,
    reset: resetApprove,
  } = useApprove();
  const {
    deposit,
    hash: depositHash,
    isPending: isDepositing,
    isConfirming: isDepositConfirming,
    isSuccess: depositSuccess,
    error: depositError,
    reset: resetDeposit,
  } = useDeposit();
  const { data: allowance } = useTokenAllowance(address);

  const [approveId, setApproveId] = useState<string | null>(null);
  const [depositId, setDepositId] = useState<string | null>(null);

  // Track if we've processed a terminal state for the current transaction
  const processedApproveSuccess = useRef(false);
  const processedDepositSuccess = useRef(false);

  // Start approve activity
  const handleApprove = () => {
    if (!amount || isNaN(Number(amount))) return;
    const id = addActivity({ type: 'approve', status: 'pending', amount });
    setApproveId(id);
    processedApproveSuccess.current = false;
    approve(amount);
  };

  // Start deposit activity
  const handleDeposit = () => {
    if (!amount || isNaN(Number(amount))) return;
    const id = addActivity({ type: 'deposit', status: 'pending', amount });
    setDepositId(id);
    processedDepositSuccess.current = false;
    deposit(amount);
  };

  // Update approve activity as it progresses
  useEffect(() => {
    if (!approveId) return;

    if (isApproveConfirming && !approveSuccess && !approveError) {
      updateActivity(approveId, { status: 'pending', message: 'Waiting for on-chain confirmation…' });
    }
  }, [isApproveConfirming, approveSuccess, approveError, approveId, updateActivity]);

  // Approve success / error
  useEffect(() => {
    if (!approveId || processedApproveSuccess.current) return;

    if (approveSuccess) {
      processedApproveSuccess.current = true;
      updateActivity(approveId, { status: 'success', message: 'Allowance approved', txHash: approveHash });
      setApproveId(null);
      const timer = setTimeout(() => resetApprove(), 2000);
      return () => clearTimeout(timer);
    }

    if (approveError) {
      processedApproveSuccess.current = true;
      if (isUserRejectedError(approveError)) {
        updateActivity(approveId, { status: 'error', message: 'Cancelled in wallet' });
      } else {
        updateActivity(approveId, { status: 'error', message: getContractErrorMessage(approveError) });
      }
      setApproveId(null);
      const timer = setTimeout(() => resetApprove(), 2000);
      return () => clearTimeout(timer);
    }
  }, [approveSuccess, approveError, approveId, approveHash, updateActivity, resetApprove]);

  // Update deposit activity as it progresses
  useEffect(() => {
    if (!depositId) return;

    if (isDepositConfirming && !depositSuccess && !depositError) {
      updateActivity(depositId, { status: 'pending', message: 'Waiting for on-chain confirmation…' });
    }
  }, [isDepositConfirming, depositSuccess, depositError, depositId, updateActivity]);

  // Deposit success / error
  useEffect(() => {
    if (!depositId || processedDepositSuccess.current) return;

    if (depositSuccess) {
      processedDepositSuccess.current = true;
      updateActivity(depositId, { status: 'success', message: 'Deposited to TokenBank', txHash: depositHash });
      setAmount('');
      setDepositId(null);
      const timer = setTimeout(() => resetDeposit(), 2000);
      return () => clearTimeout(timer);
    }

    if (depositError) {
      processedDepositSuccess.current = true;
      if (isUserRejectedError(depositError)) {
        updateActivity(depositId, { status: 'error', message: 'Cancelled in wallet' });
      } else {
        updateActivity(depositId, { status: 'error', message: getContractErrorMessage(depositError) });
      }
      setDepositId(null);
      const timer = setTimeout(() => resetDeposit(), 2000);
      return () => clearTimeout(timer);
    }
  }, [depositSuccess, depositError, depositId, depositHash, updateActivity, resetDeposit]);

  // Reset success trackers when a new transaction starts
  useEffect(() => {
    if (isApproving || isApproveConfirming) processedApproveSuccess.current = false;
  }, [isApproving, isApproveConfirming]);

  useEffect(() => {
    if (isDepositing || isDepositConfirming) processedDepositSuccess.current = false;
  }, [isDepositing, isDepositConfirming]);

  if (!address) return null;

  const isProcessing = isApproving || isApproveConfirming || isDepositing || isDepositConfirming;
  const hasAllowance = allowance !== undefined && (allowance as bigint) > 0n;

  // Surface the latest inline message from this form
  const currentActivityId = approveId || depositId;
  const currentActivityStatus = currentActivityId
    ? (() => {
        if (isApproving || isApproveConfirming || isDepositing || isDepositConfirming) return 'pending';
        return undefined;
      })()
    : undefined;

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-1 h-6 rounded-full bg-[var(--ink-green)]" />
        <h2 className="text-lg font-semibold">Deposit</h2>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              isApproving || isApproveConfirming
                ? 'bg-[var(--copper)] text-white'
                : hasAllowance || approveSuccess
                ? 'bg-[var(--ink-green)] text-white'
                : 'bg-[var(--parchment)] text-[var(--ink-muted)] border border-[var(--border)]'
            }`}
          >
            {hasAllowance || approveSuccess ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
              '1'
            )}
          </div>
          <span className={`text-sm ${hasAllowance || approveSuccess ? 'text-[var(--ink-muted)]' : 'text-[var(--ink)]'}`}>Approve</span>
        </div>

        <div className={`flex-1 h-px ${hasAllowance || approveSuccess ? 'bg-[var(--ink-green)]/30' : 'bg-[var(--border)]'}`} />

        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              isDepositing || isDepositConfirming
                ? 'bg-[var(--ink-green)] text-white'
                : depositSuccess
                ? 'bg-[var(--ink-green)] text-white'
                : 'bg-[var(--parchment)] text-[var(--ink-muted)] border border-[var(--border)]'
            }`}
          >
            {depositSuccess ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
              '2'
            )}
          </div>
          <span className={`text-sm ${depositSuccess ? 'text-[var(--ink-muted)]' : 'text-[var(--ink)]'}`}>Deposit</span>
        </div>
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

        <div className="flex gap-3">
          <button
            onClick={handleApprove}
            disabled={!amount || isApproving || isApproveConfirming}
            className="flex-1 bg-[var(--copper)] text-white py-3 px-4 rounded-lg font-medium hover:bg-[var(--copper)]/90 disabled:bg-[var(--parchment)] disabled:text-[var(--ink-muted)] flex items-center justify-center gap-2"
          >
            {isApproveConfirming ? (
              <>
                <Spinner /> Confirming
              </>
            ) : isApproving ? (
              <>
                <Spinner /> Pending
              </>
            ) : (
              'Approve'
            )}
          </button>
          <button
            onClick={handleDeposit}
            disabled={!amount || isDepositing || isDepositConfirming}
            className="flex-1 bg-[var(--ink-green)] text-white py-3 px-4 rounded-lg font-medium hover:bg-[var(--ink-green)]/90 disabled:bg-[var(--parchment)] disabled:text-[var(--ink-muted)] flex items-center justify-center gap-2"
          >
            {isDepositConfirming ? (
              <>
                <Spinner /> Confirming
              </>
            ) : isDepositing ? (
              <>
                <Spinner /> Pending
              </>
            ) : (
              'Deposit'
            )}
          </button>
        </div>

        {/* Inline status / error */}
        {currentActivityStatus === 'pending' && (
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
