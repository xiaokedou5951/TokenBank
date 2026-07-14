'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
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
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

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
  };
}
