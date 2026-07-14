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
    [anvil.id]: http('http://127.0.0.1:8545'),
    [mainnet.id]: http('https://rpc.ankr.com/eth'),
    [sepolia.id]: http('https://rpc.ankr.com/eth_sepolia'),
  },
  ssr: true,
});
