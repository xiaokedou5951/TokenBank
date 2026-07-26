'use client';

import { useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { tokenBankAbi, TOKENBANK_ADDRESS, TOKEN_ADDRESS } from '@/lib/contracts';
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

  const error = writeError || receiptError || undefined;

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

// Permit2 签名存款
export function usePermit2Deposit() {
  const queryClient = useQueryClient();
  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, isError: isReceiptError, error: receiptError } = useWaitForTransactionReceipt({
    hash,
  });

  const error = writeError || receiptError || undefined;

  useEffect(() => {
    if (isSuccess && hash) {
      queryClient.invalidateQueries({ queryKey: ['readContract'] });
    }
  }, [isSuccess, hash, queryClient]);

  const permit2Deposit = (
    amount: bigint,
    nonce: bigint,
    deadline: bigint,
    owner: `0x${string}`,
    signature: `0x${string}`
  ) => {
    writeContract({
      address: TOKENBANK_ADDRESS,
      abi: tokenBankAbi,
      functionName: 'depositWithPermit2',
      args: [
        {
          permitted: {
            token: TOKEN_ADDRESS,
            amount,
          },
          nonce,
          deadline,
        },
        owner,
        signature,
      ],
    });
  };

  return {
    permit2Deposit,
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

  const error = writeError || receiptError || undefined;

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
