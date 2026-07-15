import { ConnectWallet } from '@/components/web3/ConnectWallet';
import { BalanceCard } from '@/components/web3/BalanceCard';
import { DepositForm } from '@/components/web3/DepositForm';
import { WithdrawForm } from '@/components/web3/WithdrawForm';
import { ActivityLog } from '@/components/web3/ActivityLog';

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--parchment)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] sticky top-0 z-10 bg-[var(--parchment)]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-[var(--ink)] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--parchment)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight">TokenBank</h1>
          </div>
          <ConnectWallet />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left column: balances and actions */}
          <div className="lg:col-span-8 space-y-8">
            <section>
              <BalanceCard />
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DepositForm />
              <WithdrawForm />
            </section>
          </div>

          {/* Right column: receipt log */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <ActivityLog />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] mt-20">
        <div className="max-w-6xl mx-auto px-6 py-6 text-center text-sm text-[var(--ink-muted)]">
          Powered by Ethereum
        </div>
      </footer>
    </div>
  );
}
