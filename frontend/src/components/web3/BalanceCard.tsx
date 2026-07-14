'use client';

import { useAccount } from 'wagmi';
import { useTokenBalance, useTokenAllowance } from '@/hooks/useToken';
import { useDepositBalance } from '@/hooks/useTokenBank';
import { formatTokenAmount } from '@/lib/utils';

export function BalanceCard() {
  const { address } = useAccount();

  const { data: tokenBalance, isLoading: isLoadingToken } = useTokenBalance(address);
  const { data: depositBalance, isLoading: isLoadingDeposit } = useDepositBalance(address);
  const { data: allowance, isLoading: isLoadingAllowance } = useTokenAllowance(address);

  if (!address) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
        请先连接钱包
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">余额信息</h2>
      <div className="space-y-3">
        <div className="flex justify-between items-center py-2 border-b">
          <span className="text-gray-600">钱包余额 (MTK)</span>
          <span className="font-mono font-semibold text-gray-800">
            {isLoadingToken ? '加载中...' : formatTokenAmount(tokenBalance as bigint)}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-b">
          <span className="text-gray-600">存款余额 (MTK)</span>
          <span className="font-mono font-semibold text-gray-800">
            {isLoadingDeposit ? '加载中...' : formatTokenAmount(depositBalance as bigint)}
          </span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-gray-600">授权额度 (MTK)</span>
          <span className="font-mono font-semibold text-gray-800">
            {isLoadingAllowance ? '加载中...' : formatTokenAmount(allowance as bigint)}
          </span>
        </div>
      </div>
    </div>
  );
}
