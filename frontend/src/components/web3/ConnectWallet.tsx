'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';

export function ConnectWallet() {
  return (
    <div className="flex justify-end">
      <ConnectButton
        showBalance={false}
        chainStatus="icon"
        accountStatus="address"
      />
    </div>
  );
}
