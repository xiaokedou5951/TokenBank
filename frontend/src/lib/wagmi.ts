import { http, createConfig } from 'wagmi';
import { defineChain } from 'viem';
import { mainnet, sepolia } from 'wagmi/chains';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

// 定义本地链（Anvil）
export const anvil = defineChain({
  id: 31337,
  name: 'Anvil Local',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
  },
  blockExplorers: {
    default: { name: 'Local', url: 'http://localhost' },
  },
});

// RainbowKit 配置
export const config = getDefaultConfig({
  appName: 'TokenBank',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [anvil, mainnet, sepolia],
  transports: {
    [anvil.id]: http(process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545'),
    [mainnet.id]: http('https://rpc.ankr.com/eth'),
    // Public Sepolia RPC. Note: browser E2E of the EIP-7702 flow must use real
    // Sepolia (MetaMask cannot add a local fork as a custom network — its
    // chainId 11155111 collides with the built-in Sepolia). Local forks are
    // only used for script-level verification (scripts/e2e-7702.mjs) via RPC_URL.
    [sepolia.id]: http('https://ethereum-sepolia-rpc.publicnode.com'),
  },
  ssr: true,
});
