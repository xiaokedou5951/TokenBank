'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useApprove, useTokenAllowance, usePermitSignature, useTokenNonce } from '@/hooks/useToken';
import { useDeposit, usePermitDeposit } from '@/hooks/useTokenBank';
import { isUserRejectedError, getContractErrorMessage } from '@/lib/utils';
import { useActivity } from '@/components/web3/ActivityLog';
import { TOKENBANK_ADDRESS } from '@/lib/contracts';
import { parseTokenAmount } from '@/lib/utils';

export function DepositForm() {
  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const { addActivity, updateActivity } = useActivity();

  // Traditional deposit hooks
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

  // Permit deposit hooks
  const {
    generatePermitSignature,
    signature,
    isPending: isSigning,
    error: signError,
    reset: resetSign,
  } = usePermitSignature();
  const { data: nonce } = useTokenNonce(address);
  const {
    permitDeposit,
    hash: permitDepositHash,
    isPending: isPermitDepositing,
    isConfirming: isPermitDepositConfirming,
    isSuccess: permitDepositSuccess,
    error: permitDepositError,
    reset: resetPermitDeposit,
  } = usePermitDeposit();

  const [approveId, setApproveId] = useState<string | null>(null);
  const [depositId, setDepositId] = useState<string | null>(null);
  const [permitDepositId, setPermitDepositId] = useState<string | null>(null);
  const [permitDeadline, setPermitDeadline] = useState<bigint>(0n);

  // Track if we've processed a terminal state for the current transaction
  const processedApproveSuccess = useRef(false);
  const processedDepositSuccess = useRef(false);
  const processedPermitDepositSuccess = useRef(false);

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

  // Start permit deposit activity (one-tx deposit with signature)
  const handlePermitDeposit = async () => {
    if (!amount || isNaN(Number(amount)) || !address || nonce === undefined) return;
    const id = addActivity({ type: 'deposit', status: 'pending', amount, message: 'Signing permit...' });
    setPermitDepositId(id);
    processedPermitDepositSuccess.current = false;

    const amountBigInt = parseTokenAmount(amount);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now
    setPermitDeadline(deadline);

    try {
      await generatePermitSignature(address, TOKENBANK_ADDRESS, amountBigInt, nonce as bigint, deadline);
    } catch (err) {
      // Error is surfaced via signError in the hook; nothing to do here
      console.error('Permit signature failed:', err);
    }
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

  useEffect(() => {
    if (isPermitDepositing || isPermitDepositConfirming) processedPermitDepositSuccess.current = false;
  }, [isPermitDepositing, isPermitDepositConfirming]);

  // When signature is ready, extract v,r,s and call permitDeposit
  useEffect(() => {
    if (!signature || !permitDepositId || !address || nonce === undefined || permitDeadline === 0n) return;

    // Extract v, r, s from signature (65 bytes: r[32] + s[32] + v[1])
    const sig = signature.slice(2); // remove 0x
    const r = `0x${sig.slice(0, 64)}` as `0x${string}`;
    const s = `0x${sig.slice(64, 128)}` as `0x${string}`;
    const v = parseInt(sig.slice(128, 130), 16);

    updateActivity(permitDepositId, { message: 'Submitting deposit transaction...' });
    permitDeposit(amount, permitDeadline, v, r, s);
    resetSign(); // Clear signature after use
  }, [signature, permitDepositId, address, nonce, amount, permitDeadline, permitDeposit, updateActivity, resetSign]);

  // Update permit deposit activity as it progresses
  useEffect(() => {
    if (!permitDepositId) return;

    if (isPermitDepositConfirming && !permitDepositSuccess && !permitDepositError) {
      updateActivity(permitDepositId, { status: 'pending', message: 'Waiting for on-chain confirmation…' });
    }
  }, [isPermitDepositConfirming, permitDepositSuccess, permitDepositError, permitDepositId, updateActivity]);

  // Permit deposit success / error
  useEffect(() => {
    if (!permitDepositId || processedPermitDepositSuccess.current) return;

    if (permitDepositSuccess) {
      processedPermitDepositSuccess.current = true;
      updateActivity(permitDepositId, { status: 'success', message: 'Deposited to TokenBank (Permit)', txHash: permitDepositHash });
      setAmount('');
      setPermitDepositId(null);
      const timer = setTimeout(() => resetPermitDeposit(), 2000);
      return () => clearTimeout(timer);
    }

    if (permitDepositError) {
      processedPermitDepositSuccess.current = true;
      if (isUserRejectedError(permitDepositError)) {
        updateActivity(permitDepositId, { status: 'error', message: 'Cancelled in wallet' });
      } else {
        updateActivity(permitDepositId, { status: 'error', message: getContractErrorMessage(permitDepositError) });
      }
      setPermitDepositId(null);
      const timer = setTimeout(() => resetPermitDeposit(), 2000);
      return () => clearTimeout(timer);
    }
  }, [permitDepositSuccess, permitDepositError, permitDepositId, permitDepositHash, updateActivity, resetPermitDeposit]);

  // Handle signature error
  useEffect(() => {
    if (!signError || !permitDepositId) return;
    processedPermitDepositSuccess.current = true;
    if (isUserRejectedError(signError)) {
      updateActivity(permitDepositId, { status: 'error', message: 'Signature cancelled' });
    } else {
      updateActivity(permitDepositId, { status: 'error', message: 'Failed to sign permit' });
    }
    setPermitDepositId(null);
    const timer = setTimeout(() => resetSign(), 2000);
    return () => clearTimeout(timer);
  }, [signError, permitDepositId, updateActivity, resetSign]);

  if (!address) return null;

  const isProcessing = isApproving || isApproveConfirming || isDepositing || isDepositConfirming || isSigning || isPermitDepositing || isPermitDepositConfirming;
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

        <div className="space-y-3">
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

          <button
            onClick={handlePermitDeposit}
            disabled={!amount || isSigning || isPermitDepositing || isPermitDepositConfirming}
            className="w-full bg-gradient-to-r from-[var(--ink-green)] to-[var(--copper)] text-white py-3 px-4 rounded-lg font-medium hover:opacity-90 disabled:bg-[var(--parchment)] disabled:text-[var(--ink-muted)] disabled:from-[var(--parchment)] disabled:to-[var(--parchment)] flex items-center justify-center gap-2"
          >
            {isPermitDepositConfirming ? (
              <>
                <Spinner /> Confirming
              </>
            ) : isPermitDepositing ? (
              <>
                <Spinner /> Submitting
              </>
            ) : isSigning ? (
              <>
                <Spinner /> Signing
              </>
            ) : (
              '🚀 Permit Deposit (One-Click)'
            )}
          </button>

          <p className="text-xs text-[var(--ink-muted)] text-center">
            Permit Deposit: Sign a message to deposit in one transaction (no approve needed)
          </p>
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
