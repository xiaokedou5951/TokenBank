# TokenBank 架构文档

## 1. 目标

本文档是 TokenBank 架构文档的入口，帮助读者快速了解系统全貌，并定位到各专题架构说明。

## 2. 关键结论

- TokenBank 是一个去中心化的 ERC20 代币存取 DApp，支持 EIP-2612 Permit 签名存款。
- 系统由两层构成：**链上智能合约层** + **Next.js 前端层**。
- 合约层包含 `MyTokenPermit`（支持 EIP-2612 的 ERC20 代币）和 `TokenBankPermit`（支持 Permit 存款的银行合约）。
- 前端提供两种存款方式：传统 Approve+Deposit（两步）和 Permit Deposit（一步签名存款）。
- 当前仅支持单代币和单一 Bank 合约，无后端服务。

## 3. 文档导航

| 文档 | 说明 |
|------|------|
| [架构文档组织方式.md](./架构文档组织方式.md) | 规定架构文档如何分类、命名与演进 |
| [系统架构概览.md](./系统架构概览.md) | 系统分层、部署视图、模块边界 |
| [智能合约架构.md](./智能合约架构.md) | 合约职责、调用时序、安全机制 |
| [前端架构.md](./前端架构.md) | 前端目录、数据流、ABI 与组件设计 |

## 4. 技术栈总览

| 层级 | 技术 |
|------|------|
| 智能合约 | Solidity ^0.8.30，OpenZeppelin，Foundry |
| 部署与测试 | Foundry Forge / Anvil，Deploy.s.sol |
| 前端框架 | Next.js 16 (App Router + Turbopack)，React 19 |
| 类型与样式 | TypeScript，Tailwind CSS 4 |
| Web3 交互 | Wagmi v2，Viem v2，RainbowKit |
| 状态管理 | TanStack Query (React Query) |

## 5. 待决策 / 待办

- [ ] 是否需要引入后端索引服务以支持历史交易查询？
- [ ] 是否增加多链部署配置（目前仅本地 Anvil + Sepolia + Mainnet 配置）？
- [ ] 是否在传统 Approve+Deposit 流程基础上默认推荐 Permit Deposit？
