import { ConnectWallet } from '@/components/web3/ConnectWallet';
import { BalanceCard } from '@/components/web3/BalanceCard';
import { DepositForm } from '@/components/web3/DepositForm';
import { WithdrawForm } from '@/components/web3/WithdrawForm';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-800">TokenBank</h1>
            <ConnectWallet />
          </div>
          <p className="text-gray-600">ERC20 代币银行 DApp</p>
        </header>

        <main className="space-y-6">
          <BalanceCard />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DepositForm />
            <WithdrawForm />
          </div>
        </main>
      </div>
    </div>
  );
}
