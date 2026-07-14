'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useApprove } from '@/hooks/useToken';
import { useDeposit } from '@/hooks/useTokenBank';

export function DepositForm() {
  const { address } = useAccount();
  const [amount, setAmount] = useState('');

  const { approve, isPending: isApproving, isConfirming: isApproveConfirming, isSuccess: approveSuccess } = useApprove();
  const { deposit, isPending: isDepositing, isConfirming: isDepositConfirming, isSuccess: depositSuccess } = useDeposit();

  const handleApprove = () => {
    if (!amount || isNaN(Number(amount))) return;
    approve(amount);
  };

  const handleDeposit = () => {
    if (!amount || isNaN(Number(amount))) return;
    deposit(amount);
  };

  if (!address) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">存款</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">金额 (MTK)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="输入存款金额"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleApprove}
            disabled={!amount || isApproving || isApproveConfirming}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isApproving ? '提交中...' : isApproveConfirming ? '确认中...' : '授权'}
          </button>
          <button
            onClick={handleDeposit}
            disabled={!amount || isDepositing || isDepositConfirming}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isDepositing ? '提交中...' : isDepositConfirming ? '确认中...' : '存款'}
          </button>
        </div>
        {approveSuccess && <p className="text-sm text-green-600">授权成功！</p>}
        {depositSuccess && <p className="text-sm text-green-600">存款成功！</p>}
      </div>
    </div>
  );
}
