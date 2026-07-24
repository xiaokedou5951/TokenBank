'use client';

import { useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useSignTypedData, useChainId } from 'wagmi';
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

export function useTokenNonce(address: `0x${string}` | undefined) {
  return useReadContract({
    address: TOKEN_ADDRESS,
    abi: myTokenAbi,
    functionName: 'nonces',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

export function useTokenDomainSeparator() {
  return useReadContract({
    address: TOKEN_ADDRESS,
    abi: myTokenAbi,
    functionName: 'DOMAIN_SEPARATOR',
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

// Generate EIP-2612 permit signature
export function usePermitSignature() {
  const { signTypedDataAsync, data: signature, isPending, error, reset } = useSignTypedData();
  const chainId = useChainId();

  const generatePermitSignature = async (
    owner: `0x${string}`,
    spender: `0x${string}`,
    value: bigint,
    nonce: bigint,
    deadline: bigint
  ) => {
    const domain = {
      name: 'MyTokenPermit',
      version: '1',
      chainId,
      verifyingContract: TOKEN_ADDRESS,
    };

    const types = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    };

    const message = {
      owner,
      spender,
      value,
      nonce,
      deadline,
    };

    await signTypedDataAsync({ domain, types, primaryType: 'Permit', message });
  };

  return {
    generatePermitSignature,
    signature,
    isPending,
    error,
    reset,
  };
}
