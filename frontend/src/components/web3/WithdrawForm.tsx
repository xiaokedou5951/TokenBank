'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useWithdraw } from '@/hooks/useTokenBank';
import { isUserRejectedError } from '@/lib/utils';

export function WithdrawForm() {
  const { address } = useAccount();
  const [amount, setAmount] = useState('');

  const { withdraw, isPending, isConfirming, isSuccess, error } = useWithdraw();

  const handleWithdraw = () => {
    if (!amount || isNaN(Number(amount))) return;
    withdraw(amount);
  };

  if (!address) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">取款</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">金额 (MTK)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="输入取款金额"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={handleWithdraw}
          disabled={!amount || isPending || isConfirming}
          className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? '提交中...' : isConfirming ? '确认中...' : '取款'}
        </button>
        {isSuccess && <p className="text-sm text-green-600">取款成功！</p>}
        {error && !isUserRejectedError(error) && <p className="text-sm text-red-600">取款失败: {error.message}</p>}
      </div>
    </div>
  );
}
