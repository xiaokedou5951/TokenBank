'use client';

import { useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { myTokenAbi, TOKEN_ADDRESS, TOKENBANK_ADDRESS } from '@/lib/contracts';
import { parseTokenAmount } from '@/lib/utils';

export function useTokenBalance(address: `0x${string}` | undefined) {
  return useReadContract({
    address: TOKEN_ADDRESS,
    abi: myTokenAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

export function useTokenAllowance(address: `0x${string}` | undefined) {
  return useReadContract({
    address: TOKEN_ADDRESS,
    abi: myTokenAbi,
    functionName: 'allowance',
    args: address ? [address, TOKENBANK_ADDRESS] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

export function useApprove() {
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

  const approve = (amount: string) => {
    const amountBigInt = parseTokenAmount(amount);
    writeContract({
      address: TOKEN_ADDRESS,
      abi: myTokenAbi,
      functionName: 'approve',
      args: [TOKENBANK_ADDRESS, amountBigInt],
    });
  };

  return {
    approve,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}
