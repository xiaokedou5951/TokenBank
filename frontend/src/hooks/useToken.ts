'use client';

import { useEffect, useCallback } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useSignTypedData, useChainId } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { myTokenAbi, permit2Abi, TOKEN_ADDRESS, TOKENBANK_ADDRESS, PERMIT2_ADDRESS } from '@/lib/contracts';
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

// 查询用户对 Permit2 合约的 token 授权额度
export function usePermit2Allowance(address: `0x${string}` | undefined) {
  return useReadContract({
    address: TOKEN_ADDRESS,
    abi: myTokenAbi,
    functionName: 'allowance',
    args: address ? [address, PERMIT2_ADDRESS] : undefined,
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

  const error = writeError || receiptError || undefined;

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

// 授权 Permit2 合约管理代币（一次性操作）
export function useApprovePermit2() {
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

  const approvePermit2 = () => {
    // MAX_UINT256 授权，一次性授权
    const MAX_UINT256 = 2n ** 256n - 1n;
    writeContract({
      address: TOKEN_ADDRESS,
      abi: myTokenAbi,
      functionName: 'approve',
      args: [PERMIT2_ADDRESS, MAX_UINT256],
    });
  };

  return {
    approvePermit2,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}

// 读取 Permit2 nonceBitmap 并找到下一个可用 nonce
export function usePermit2Nonce(address: `0x${string}` | undefined) {
  // 读取 word index = 0 的 bitmap
  const { data: bitmap, refetch } = useReadContract({
    address: PERMIT2_ADDRESS,
    abi: permit2Abi,
    functionName: 'nonceBitmap',
    args: address ? [address, 0n] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const getNextNonce = (): bigint => {
    // bitmap 中为 0 的位表示可用 nonce
    const bitmapValue = (bitmap as bigint) ?? 0n;
    // 找到最低的 0 位（第一个可用位）
    for (let i = 0; i < 256; i++) {
      if (!(bitmapValue & (1n << BigInt(i)))) {
        // nonce = (wordIndex << 8) | bitPosition
        return BigInt(i);
      }
    }
    // 如果 word 0 的所有位都用了，使用 word 1（极端情况）
    return 256n;
  };

  return {
    bitmap,
    getNextNonce,
    refetchNonce: refetch,
  };
}

// 生成 Permit2 EIP-712 签名
export function usePermit2Signature() {
  const { signTypedDataAsync, data: signature, isPending, error, reset } = useSignTypedData();
  const chainId = useChainId();

  const generatePermit2Signature = useCallback(
    async (tokenAddress: `0x${string}`, amount: bigint, nonce: bigint, deadline: bigint) => {
      const domain = {
        name: 'Permit2',
        chainId,
        verifyingContract: PERMIT2_ADDRESS,
      };

      const types = {
        PermitTransferFrom: [
          { name: 'permitted', type: 'TokenPermissions' },
          { name: 'spender', type: 'address' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
        TokenPermissions: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
      };

      const message = {
        permitted: {
          token: tokenAddress,
          amount,
        },
        spender: TOKENBANK_ADDRESS,
        nonce,
        deadline,
      };

      await signTypedDataAsync({
        domain,
        types,
        primaryType: 'PermitTransferFrom',
        message,
      });
    },
    [signTypedDataAsync, chainId]
  );

  return {
    generatePermit2Signature,
    signature,
    isPending,
    error,
    reset,
  };
}
