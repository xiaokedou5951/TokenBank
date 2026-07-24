# TokenBank 文档

## 项目简介

TokenBank 是一个去中心化的 ERC20 代币存取 DApp，支持 EIP-2612 Permit 签名存款。系统由两层构成：链上智能合约层（MyTokenPermit + TokenBankPermit）和浏览器前端层（Next.js + Wagmi）。

## 文档结构

```
docs/
├── README.md                          ← 你在这里
├── prd/
│   └── TokenBank需求.md               # 产品需求
├── architecture/                      # 架构设计文档
│   ├── README.md                      #   架构文档入口
│   ├── 系统架构概览.md                 #   系统分层、模块边界、部署视图
│   ├── 智能合约架构.md                 #   合约职责、调用时序、安全机制
│   ├── 前端架构.md                     #   前端目录、数据流、技术决策
│   └── 架构文档组织方式.md             #   文档组织规范
├── dev/                               # 开发运维文档
│   ├── 环境搭建.md                     #   依赖安装、本地开发启动
│   └── 部署指南.md                     #   合约与前端部署、环境变量
└── 总结/
    └── 对话.txt                        # 开发对话记录
```

## 阅读指南

### 快速上手（新开发者）

按以下顺序阅读，约 30 分钟可完成从理解到运行：

1. [系统架构概览](./architecture/系统架构概览.md) — 建立全局视图（5 min）
2. [环境搭建](./dev/环境搭建.md) — 搭建本地环境（10 min）
3. [部署指南](./dev/部署指南.md) — 部署合约并启动前端（10 min）
4. [前端架构](./architecture/前端架构.md) — 理解前端数据流和 Permit 存款（5 min）

### 深入理解

5. [智能合约架构](./architecture/智能合约架构.md) — 合约时序、EIP-2612 机制、安全分析
6. [架构文档组织方式](./architecture/架构文档组织方式.md) — 文档维护规范

### 按角色查阅

| 角色 | 推荐文档 |
|------|----------|
| 新加入开发者 | 系统架构概览 → 环境搭建 → 部署指南 |
| 合约开发者 / 审计者 | 智能合约架构 → 系统架构概览 |
| 前端开发者 | 前端架构 → 系统架构概览 |
| 部署者 | 部署指南 → 环境搭建 |
| 产品经理 | TokenBank需求.md → 系统架构概览 |

## 技术栈

| 层级 | 技术 |
|------|------|
| 智能合约 | Solidity ^0.8.30，OpenZeppelin，Foundry |
| 前端框架 | Next.js 16 (App Router + Turbopack)，React 19，TypeScript |
| 样式 | Tailwind CSS 4 |
| Web3 交互 | Wagmi v2，Viem v2，RainbowKit |
| 状态管理 | TanStack Query (React Query) |

## 核心特性

| 特性 | 说明 |
|------|------|
| 传统存款 | Approve + Deposit，两步交易 |
| Permit 存款 | EIP-2612 签名存款，一步完成，省 gas |
| 取款 | Checks-Effects-Interactions + ReentrancyGuard |
| 代币铸造 | 仅 owner 可铸造新代币 |
| 代币销毁 | 支持 ERC20Burnable |
