'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useApprove, useTokenAllowance } from '@/hooks/useToken';
import { useDeposit } from '@/hooks/useTokenBank';
import { isUserRejectedError } from '@/lib/utils';
import { useToast } from '@/components/web3/Toast';
import { TOKENBANK_ADDRESS } from '@/lib/contracts';

export function DepositForm() {
  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const { addToast } = useToast();

  const { approve, isPending: isApproving, isConfirming: isApproveConfirming, isSuccess: approveSuccess, error: approveError, reset: resetApprove } = useApprove();
  const { deposit, isPending: isDepositing, isConfirming: isDepositConfirming, isSuccess: depositSuccess, error: depositError, reset: resetDeposit } = useDeposit();
  const { data: allowance } = useTokenAllowance(address);

  // Track if we've shown the success toast to avoid duplicates
  const shownApproveSuccess = useRef(false);
  const shownDepositSuccess = useRef(false);

  // Handle approve success
  useEffect(() => {
    if (approveSuccess && !shownApproveSuccess.current) {
      shownApproveSuccess.current = true;
      addToast('success', 'Approved — ready to deposit');
      // Reset after a moment so user can approve again
      const timer = setTimeout(() => resetApprove(), 2000);
      return () => clearTimeout(timer);
    }
  }, [approveSuccess, addToast, resetApprove]);

  // Handle deposit success
  useEffect(() => {
    if (depositSuccess && !shownDepositSuccess.current) {
      shownDepositSuccess.current = true;
      addToast('success', 'Deposited successfully');
      setAmount('');
      const timer = setTimeout(() => resetDeposit(), 2000);
      return () => clearTimeout(timer);
    }
  }, [depositSuccess, addToast, resetDeposit]);

  // Handle errors (silent for user rejected)
  useEffect(() => {
    if (approveError && !isUserRejectedError(approveError)) {
      addToast('error', 'Approval failed');
      resetApprove();
    }
  }, [approveError, addToast, resetApprove]);

  useEffect(() => {
    if (depositError && !isUserRejectedError(depositError)) {
      addToast('error', 'Deposit failed');
      resetDeposit();
    }
  }, [depositError, addToast, resetDeposit]);

  // Reset success tracking when new tx starts
  useEffect(() => {
    if (isApproving || isApproveConfirming) shownApproveSuccess.current = false;
  }, [isApproving, isApproveConfirming]);

  useEffect(() => {
    if (isDepositing || isDepositConfirming) shownDepositSuccess.current = false;
  }, [isDepositing, isDepositConfirming]);

  const handleApprove = () => {
    if (!amount || isNaN(Number(amount))) return;
    approve(amount);
  };

  const handleDeposit = () => {
    if (!amount || isNaN(Number(amount))) return;
    deposit(amount);
  };

  if (!address) return null;

  const isProcessing = isApproving || isApproveConfirming || isDepositing || isDepositConfirming;
  const hasAllowance = allowance !== undefined && (allowance as bigint) > 0n;

  // Determine current step
  const step = isApproving || isApproveConfirming ? 'approving' : isDepositing || isDepositConfirming ? 'depositing' : 'idle';

  return (
    <div className="card p-6">
      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
            step === 'approving' ? 'bg-[var(--accent-blue)] text-white animate-spin-slow' :
            hasAllowance || approveSuccess ? 'bg-[var(--accent-green)] text-white' :
            'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
          }`}>
            {hasAllowance || approveSuccess ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            ) : '1'}
          </div>
          <span className={`text-sm transition-colors ${hasAllowance || approveSuccess ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
            Approve
          </span>
        </div>

        <div className={`flex-1 h-px transition-colors ${hasAllowance || approveSuccess ? 'bg-[var(--accent-green)]/40' : 'bg-[var(--border-subtle)]'}`} />

        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
            step === 'depositing' ? 'bg-[var(--accent-green)] text-white animate-spin-slow' :
            depositSuccess ? 'bg-[var(--accent-green)] text-white' :
            'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
          }`}>
            {depositSuccess ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            ) : '2'}
          </div>
          <span className={`text-sm transition-colors ${depositSuccess ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
            Deposit
          </span>
        </div>
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

        <div className="flex gap-3">
          <button
            onClick={handleApprove}
            disabled={!amount || isApproving || isApproveConfirming}
            className="flex-1 bg-[var(--accent-blue)] text-white py-3 px-4 rounded-lg font-medium hover:bg-[var(--accent-blue)]/90 disabled:bg-[var(--bg-elevated)] disabled:text-[var(--text-muted)] flex items-center justify-center gap-2"
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
            className="flex-1 bg-[var(--accent-green)] text-white py-3 px-4 rounded-lg font-medium hover:bg-[var(--accent-green)]/90 disabled:bg-[var(--bg-elevated)] disabled:text-[var(--text-muted)] flex items-center justify-center gap-2"
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
