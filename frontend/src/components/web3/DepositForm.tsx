'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useApprove, useTokenAllowance, usePermit2Allowance, useApprovePermit2, usePermit2Signature, usePermit2Nonce } from '@/hooks/useToken';
import { useDeposit, usePermit2Deposit } from '@/hooks/useTokenBank';
import { isUserRejectedError, getContractErrorMessage, parseTokenAmount } from '@/lib/utils';
import { useActivity } from '@/components/web3/ActivityLog';
import { TOKENBANK_ADDRESS, TOKEN_ADDRESS } from '@/lib/contracts';

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

  // Permit2 hooks
  const { data: permit2Allowance } = usePermit2Allowance(address);
  const {
    approvePermit2,
    hash: approvePermit2Hash,
    isPending: isApprovingPermit2,
    isConfirming: isApprovePermit2Confirming,
    isSuccess: approvePermit2Success,
    error: approvePermit2Error,
    reset: resetApprovePermit2,
  } = useApprovePermit2();
  const {
    generatePermit2Signature,
    signature,
    isPending: isSigning,
    error: signError,
    reset: resetSign,
  } = usePermit2Signature();
  const { getNextNonce, refetchNonce } = usePermit2Nonce(address);
  const {
    permit2Deposit,
    hash: permit2DepositHash,
    isPending: isPermit2Depositing,
    isConfirming: isPermit2DepositConfirming,
    isSuccess: permit2DepositSuccess,
    error: permit2DepositError,
    reset: resetPermit2Deposit,
  } = usePermit2Deposit();

  const [approveId, setApproveId] = useState<string | null>(null);
  const [depositId, setDepositId] = useState<string | null>(null);
  const [approvePermit2Id, setApprovePermit2Id] = useState<string | null>(null);
  const [permit2DepositId, setPermit2DepositId] = useState<string | null>(null);
  const [permit2Deadline, setPermit2Deadline] = useState<bigint>(0n);
  const [permit2Nonce, setPermit2Nonce] = useState<bigint>(0n);

  // Track if we've processed a terminal state for the current transaction
  const processedApproveSuccess = useRef(false);
  const processedDepositSuccess = useRef(false);
  const processedApprovePermit2Success = useRef(false);
  const processedPermit2DepositSuccess = useRef(false);

  // Whether user has approved Permit2
  const hasPermit2Allowance = permit2Allowance !== undefined && (permit2Allowance as bigint) > 0n;

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

  // Start Permit2 approve activity
  const handleApprovePermit2 = () => {
    const id = addActivity({ type: 'approve', status: 'pending', amount: '∞', message: 'Approving Permit2...' });
    setApprovePermit2Id(id);
    processedApprovePermit2Success.current = false;
    approvePermit2();
  };

  // Start Permit2 deposit activity (sign + submit)
  const handlePermit2Deposit = async () => {
    if (!amount || isNaN(Number(amount)) || !address) return;

    // 修复：直接从 refetchNonce 获取最新 nonce
    const nonce = await refetchNonce();

    const id = addActivity({ type: 'deposit', status: 'pending', amount, message: 'Signing Permit2 message...' });
    setPermit2DepositId(id);
    processedPermit2DepositSuccess.current = false;

    const amountBigInt = parseTokenAmount(amount);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now
    setPermit2Deadline(deadline);
    setPermit2Nonce(nonce);

    try {
      // 修复：直接使用签名的返回值，不依赖 React 状态
      const sig = await generatePermit2Signature(TOKEN_ADDRESS, amountBigInt, nonce, deadline);
      // signTypedDataAsync 返回签名或 undefined
      if (sig !== undefined) {
        updateActivity(id, { message: 'Submitting deposit transaction...' });
        permit2Deposit(amountBigInt, nonce, deadline, address, sig);
      }
    } catch (err) {
      console.error('Permit2 signature failed:', err);
      if (isUserRejectedError(err as Error)) {
        updateActivity(id, { status: 'error', message: 'Signature cancelled' });
      } else {
        updateActivity(id, { status: 'error', message: 'Failed to sign Permit2 message' });
      }
      setPermit2DepositId(null);
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

  // Approve Permit2 success / error
  useEffect(() => {
    if (!approvePermit2Id || processedApprovePermit2Success.current) return;

    if (isApprovePermit2Confirming && !approvePermit2Success && !approvePermit2Error) {
      updateActivity(approvePermit2Id, { status: 'pending', message: 'Waiting for on-chain confirmation…' });
    }

    if (approvePermit2Success) {
      processedApprovePermit2Success.current = true;
      updateActivity(approvePermit2Id, { status: 'success', message: 'Permit2 approved', txHash: approvePermit2Hash });
      setApprovePermit2Id(null);
      const timer = setTimeout(() => resetApprovePermit2(), 2000);
      return () => clearTimeout(timer);
    }

    if (approvePermit2Error) {
      processedApprovePermit2Success.current = true;
      if (isUserRejectedError(approvePermit2Error)) {
        updateActivity(approvePermit2Id, { status: 'error', message: 'Cancelled in wallet' });
      } else {
        updateActivity(approvePermit2Id, { status: 'error', message: getContractErrorMessage(approvePermit2Error) });
      }
      setApprovePermit2Id(null);
      const timer = setTimeout(() => resetApprovePermit2(), 2000);
      return () => clearTimeout(timer);
    }
  }, [approvePermit2Success, approvePermit2Error, approvePermit2Id, approvePermit2Hash, isApprovePermit2Confirming, updateActivity, resetApprovePermit2]);

  // Reset success trackers when a new transaction starts
  useEffect(() => {
    if (isApproving || isApproveConfirming) processedApproveSuccess.current = false;
  }, [isApproving, isApproveConfirming]);

  useEffect(() => {
    if (isDepositing || isDepositConfirming) processedDepositSuccess.current = false;
  }, [isDepositing, isDepositConfirming]);

  useEffect(() => {
    if (isApprovingPermit2 || isApprovePermit2Confirming) processedApprovePermit2Success.current = false;
  }, [isApprovingPermit2, isApprovePermit2Confirming]);

  useEffect(() => {
    if (isPermit2Depositing || isPermit2DepositConfirming) processedPermit2DepositSuccess.current = false;
  }, [isPermit2Depositing, isPermit2DepositConfirming]);

  // When Permit2 signature is ready, call depositWithPermit2
  // 注释掉：现在直接在 handlePermit2Deposit 中使用签名返回值，避免 React 状态竞态条件
  /*
  useEffect(() => {
    if (!signature || !permit2DepositId || !address || permit2Deadline === 0n) return;

    const amountBigInt = parseTokenAmount(amount);
    updateActivity(permit2DepositId, { message: 'Submitting deposit transaction...' });
    permit2Deposit(amountBigInt, permit2Nonce, permit2Deadline, address, signature);
    resetSign();
  }, [signature, permit2DepositId, address, amount, permit2Deadline, permit2Nonce, permit2Deposit, updateActivity, resetSign]);
  */

  // Update Permit2 deposit activity as it progresses
  useEffect(() => {
    if (!permit2DepositId) return;

    if (isPermit2DepositConfirming && !permit2DepositSuccess && !permit2DepositError) {
      updateActivity(permit2DepositId, { status: 'pending', message: 'Waiting for on-chain confirmation…' });
    }
  }, [isPermit2DepositConfirming, permit2DepositSuccess, permit2DepositError, permit2DepositId, updateActivity]);

  // Permit2 deposit success / error
  useEffect(() => {
    if (!permit2DepositId || processedPermit2DepositSuccess.current) return;

    if (permit2DepositSuccess) {
      processedPermit2DepositSuccess.current = true;
      updateActivity(permit2DepositId, { status: 'success', message: 'Deposited to TokenBank (Permit2)', txHash: permit2DepositHash });
      setAmount('');
      setPermit2DepositId(null);
      // 修复：deposit 成功后刷新 nonce bitmap，为下次 deposit 准备
      refetchNonce().catch(console.error);
      const timer = setTimeout(() => resetPermit2Deposit(), 2000);
      return () => clearTimeout(timer);
    }

    if (permit2DepositError) {
      processedPermit2DepositSuccess.current = true;
      if (isUserRejectedError(permit2DepositError)) {
        updateActivity(permit2DepositId, { status: 'error', message: 'Cancelled in wallet' });
      } else {
        updateActivity(permit2DepositId, { status: 'error', message: getContractErrorMessage(permit2DepositError) });
      }
      setPermit2DepositId(null);
      const timer = setTimeout(() => resetPermit2Deposit(), 2000);
      return () => clearTimeout(timer);
    }
  }, [permit2DepositSuccess, permit2DepositError, permit2DepositId, permit2DepositHash, updateActivity, resetPermit2Deposit]);

  // Handle signature error
  useEffect(() => {
    if (!signError || !permit2DepositId) return;
    processedPermit2DepositSuccess.current = true;
    if (isUserRejectedError(signError)) {
      updateActivity(permit2DepositId, { status: 'error', message: 'Signature cancelled' });
    } else {
      updateActivity(permit2DepositId, { status: 'error', message: 'Failed to sign Permit2 message' });
    }
    setPermit2DepositId(null);
    const timer = setTimeout(() => resetSign(), 2000);
    return () => clearTimeout(timer);
  }, [signError, permit2DepositId, updateActivity, resetSign]);

  if (!address) return null;

  const isProcessing = isApproving || isApproveConfirming || isDepositing || isDepositConfirming || isSigning || isPermit2Depositing || isPermit2DepositConfirming || isApprovingPermit2 || isApprovePermit2Confirming;
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
          {/* Traditional Approve + Deposit */}
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

          {/* Permit2 Deposit Section */}
          <div className="border-t border-[var(--border)] pt-3">
            {!hasPermit2Allowance ? (
              <button
                onClick={handleApprovePermit2}
                disabled={isApprovingPermit2 || isApprovePermit2Confirming}
                className="w-full bg-[var(--copper)]/80 text-white py-3 px-4 rounded-lg font-medium hover:bg-[var(--copper)] disabled:bg-[var(--parchment)] disabled:text-[var(--ink-muted)] flex items-center justify-center gap-2"
              >
                {isApprovePermit2Confirming ? (
                  <>
                    <Spinner /> Confirming
                  </>
                ) : isApprovingPermit2 ? (
                  <>
                    <Spinner /> Pending
                  </>
                ) : (
                  'Approve Permit2 (One-time)'
                )}
              </button>
            ) : (
              <button
                onClick={handlePermit2Deposit}
                disabled={!amount || isSigning || isPermit2Depositing || isPermit2DepositConfirming}
                className="w-full bg-gradient-to-r from-[var(--ink-green)] to-[var(--copper)] text-white py-3 px-4 rounded-lg font-medium hover:opacity-90 disabled:bg-[var(--parchment)] disabled:text-[var(--ink-muted)] disabled:from-[var(--parchment)] disabled:to-[var(--parchment)] flex items-center justify-center gap-2"
              >
                {isPermit2DepositConfirming ? (
                  <>
                    <Spinner /> Confirming
                  </>
                ) : isPermit2Depositing ? (
                  <>
                    <Spinner /> Submitting
                  </>
                ) : isSigning ? (
                  <>
                    <Spinner /> Signing
                  </>
                ) : (
                  '🚀 Permit2 Deposit (One-Click)'
                )}
              </button>
            )}
            <p className="text-xs text-[var(--ink-muted)] text-center mt-2">
              {hasPermit2Allowance
                ? 'Permit2 Deposit: Sign a message to deposit in one transaction (no approve needed)'
                : 'First, approve Permit2 contract to manage your tokens (one-time setup)'}
            </p>
          </div>
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
