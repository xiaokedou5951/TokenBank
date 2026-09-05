'use client';

import { useEffect, useRef } from 'react';
import { useAccount, usePublicClient, useCapabilities, useSendCalls, useWaitForCallsStatus } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { encodeFunctionData, type Address } from 'viem';
import {
  myTokenAbi,
  tokenBankAbi,
  TOKEN_ADDRESS,
  TOKENBANK_ADDRESS,
  EIP7702_DELEGATION_PREFIX,
} from '@/lib/contracts';
import { parseTokenAmount } from '@/lib/utils';

// ── EIP-7702 delegation status ────────────────────────────────────────────────

export interface DelegationStatus {
  /** true when account.code starts with the 0xef0100 designator */
  delegated: boolean;
  /** the delegate address when delegated (e.g. MetaMask Delegator) */
  delegate?: Address;
}

/**
 * Read the EIP-7702 delegation status of an account.
 * After a Type-0x04 transaction, account.code = 0xef0100 || delegate (23 bytes).
 */
export function useDelegationStatus(address: Address | undefined) {
  const publicClient = usePublicClient();

  return useQuery<DelegationStatus>({
    queryKey: ['delegationStatus', address?.toLowerCase(), publicClient?.chain?.id],
    queryFn: async () => {
      if (!address || !publicClient) return { delegated: false };
      const code = await publicClient.getCode({ address });
      const delegated = !!code && code.toLowerCase().startsWith(EIP7702_DELEGATION_PREFIX);
      const delegate =
        delegated && code && code.length >= 48
          ? (`0x${code.slice(8, 48)}` as Address)
          : undefined;
      return { delegated, delegate };
    },
    enabled: !!address && !!publicClient,
  });
}

// ── Wallet atomic-batch capability (ERC-5792) ────────────────────────────────

export interface AtomicBatchCapability {
  /** 'supported' | 'not-supported' | undefined (unknown = wallet didn't report) */
  status: 'supported' | 'not-supported' | undefined;
  /** true when the wallet explicitly supports atomic batch (wallet_sendCalls) */
  supported: boolean;
  isLoading: boolean;
}

/**
 * Query the wallet's ERC-5792 capabilities to detect atomic batch support.
 * MetaMask reports `atomicBatch: supported` once the Smart Account feature
 * is enabled for the connected account.
 */
export function useAtomicBatchCapability(): AtomicBatchCapability {
  const { address, chainId } = useAccount();
  const { data, isLoading } = useCapabilities({
    account: address,
  });

  const chainCaps = chainId !== undefined ? (data as Record<string, any>)?.[String(chainId)] : undefined;
  const status = chainCaps?.atomicBatch?.status as 'supported' | 'not-supported' | undefined;

  return {
    status,
    // Unknown capability is still allowed: the call can be attempted
    supported: status === 'supported' || status === undefined,
    isLoading,
  };
}

// ── One-tx 7702 deposit (delegation + approve + deposit) ─────────────────────

export function use7702Deposit() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  const {
    sendCalls,
    data,
    isPending,
    error: sendError,
    reset,
  } = useSendCalls();

  const id = data?.id;

  const {
    data: callsStatus,
    isLoading: isConfirming,
    error: statusError,
  } = useWaitForCallsStatus({
    id: id ?? undefined,
  });

  const isSuccess = callsStatus?.status === 'success';
  const isFailed = callsStatus?.status === 'failure';
  const error = sendError || statusError || (isFailed ? new Error('Call bundle failed on-chain') : undefined);

  const txHash = callsStatus?.receipts?.[0]?.transactionHash as `0x${string}` | undefined;

  const processedSuccess = useRef(false);

  // Invalidate balances when the atomic batch confirms
  useEffect(() => {
    if (isSuccess && id && !processedSuccess.current) {
      processedSuccess.current = true;
      queryClient.invalidateQueries({ queryKey: ['readContract'] });
      queryClient.invalidateQueries({ queryKey: ['delegationStatus'] });
    }
  }, [isSuccess, id, queryClient]);

  // Reset the success tracker when a new batch starts
  useEffect(() => {
    if (isPending) processedSuccess.current = false;
  }, [isPending]);

  /**
   * Deposit via EIP-7702 in ONE transaction:
   * MetaMask packages [approve, deposit] into an atomic Type-0x04 batch and
   * (when upgrading the account) adds the 7702 authorization delegating the
   * EOA to the official MetaMask Delegator in the same transaction.
   *
   * @param amount Human-readable token amount (e.g. "1.5")
   * @param approveAmount Optional explicit approve amount; defaults to `amount`
   *                      (exact-value approval, consumed by the deposit itself)
   */
  const deposit7702 = (amount: string, approveAmount?: string) => {
    if (!address) return;
    const amountBigInt = parseTokenAmount(amount);
    const approveBigInt = approveAmount !== undefined ? parseTokenAmount(approveAmount) : amountBigInt;

    sendCalls({
      account: address,
      calls: [
        {
          to: TOKEN_ADDRESS,
          data: encodeFunctionData({
            abi: myTokenAbi,
            functionName: 'approve',
            args: [TOKENBANK_ADDRESS, approveBigInt],
          }),
        },
        {
          to: TOKENBANK_ADDRESS,
          data: encodeFunctionData({
            abi: tokenBankAbi,
            functionName: 'deposit',
            args: [amountBigInt],
          }),
        },
      ],
    });
  };

  return {
    deposit7702,
    id,
    status: callsStatus?.status,
    txHash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}
