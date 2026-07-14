import { ConnectWallet } from '@/components/web3/ConnectWallet';
import { BalanceCard } from '@/components/web3/BalanceCard';
import { DepositForm } from '@/components/web3/DepositForm';
import { WithdrawForm } from '@/components/web3/WithdrawForm';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--border-subtle)] sticky top-0 z-10 backdrop-blur-md bg-[var(--bg-page)]/80">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-green)] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight">TokenBank</h1>
          </div>
          <ConnectWallet />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Hero: Balance Card */}
        <section className="mb-12">
          <BalanceCard />
        </section>

        {/* Actions: Deposit & Withdraw */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DepositForm />
          <WithdrawForm />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-subtle)] mt-20">
        <div className="max-w-5xl mx-auto px-6 py-6 text-center text-sm text-[var(--text-muted)]">
          Powered by Ethereum
        </div>
      </footer>
    </div>
  );
}
