'use client';

import { useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { tokenBankAbi, TOKENBANK_ADDRESS } from '@/lib/contracts';
import { parseTokenAmount } from '@/lib/utils';

export function useDepositBalance(address: `0x${string}` | undefined) {
  return useReadContract({
    address: TOKENBANK_ADDRESS,
    abi: tokenBankAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

export function useDeposit() {
  const queryClient = useQueryClient();
  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, isError: isReceiptError, error: receiptError } = useWaitForTransactionReceipt({
    hash,
  });

  // Combined error: write error (user rejected, simulation fail) or receipt error (on-chain revert)
  const error = writeError || receiptError || undefined;

  // Invalidate balance queries when transaction confirms
  useEffect(() => {
    if (isSuccess && hash) {
      queryClient.invalidateQueries({ queryKey: ['readContract'] });
    }
  }, [isSuccess, hash, queryClient]);

  const deposit = (amount: string) => {
    const amountBigInt = parseTokenAmount(amount);
    writeContract({
      address: TOKENBANK_ADDRESS,
      abi: tokenBankAbi,
      functionName: 'deposit',
      args: [amountBigInt],
    });
  };

  return {
    deposit,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}

export function usePermitDeposit() {
  const queryClient = useQueryClient();
  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, isError: isReceiptError, error: receiptError } = useWaitForTransactionReceipt({
    hash,
  });

  // Combined error: write error (user rejected, simulation fail) or receipt error (on-chain revert)
  const error = writeError || receiptError || undefined;

  // Invalidate balance queries when transaction confirms
  useEffect(() => {
    if (isSuccess && hash) {
      queryClient.invalidateQueries({ queryKey: ['readContract'] });
    }
  }, [isSuccess, hash, queryClient]);

  const permitDeposit = (
    amount: string,
    deadline: bigint,
    v: number,
    r: `0x${string}`,
    s: `0x${string}`
  ) => {
    const amountBigInt = parseTokenAmount(amount);
    writeContract({
      address: TOKENBANK_ADDRESS,
      abi: tokenBankAbi,
      functionName: 'permitDeposit',
      args: [amountBigInt, deadline, v, r, s],
    });
  };

  return {
    permitDeposit,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}

export function useWithdraw() {
  const queryClient = useQueryClient();
  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, isError: isReceiptError, error: receiptError } = useWaitForTransactionReceipt({
    hash,
  });

  // Combined error: write error (user rejected, simulation fail) or receipt error (on-chain revert)
  const error = writeError || receiptError || undefined;

  // Invalidate balance queries when transaction confirms
  useEffect(() => {
    if (isSuccess && hash) {
      queryClient.invalidateQueries({ queryKey: ['readContract'] });
    }
  }, [isSuccess, hash, queryClient]);

  const withdraw = (amount: string) => {
    const amountBigInt = parseTokenAmount(amount);
    writeContract({
      address: TOKENBANK_ADDRESS,
      abi: tokenBankAbi,
      functionName: 'withdraw',
      args: [amountBigInt],
    });
  };

  return {
    withdraw,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}
