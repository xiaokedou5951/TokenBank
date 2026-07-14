'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
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
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

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
  };
}

export function useWithdraw() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

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
  };
}
