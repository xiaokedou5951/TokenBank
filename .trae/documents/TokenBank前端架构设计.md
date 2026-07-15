# TokenBank 前端架构设计计划

## 一、项目概述

### 1.1 项目背景
TokenBank 是一个代币银行 DApp，允许用户存取 ERC20 代币。智能合约已完成开发并部署，现需要创建前端界面。

### 1.2 核心功能需求
根据 PRD 文档，前端需要实现以下功能：
1. **钱包连接** - 使用 RainbowKit 连接 MetaMask 等钱包
2. **余额显示** - 显示用户钱包中的 Token 余额和在 TokenBank 中的存款余额
3. **授权管理** - 显示用户对 TokenBank 合约的授权额度
4. **存款功能** - 用户可以先授权，然后存款到 TokenBank
5. **取款功能** - 用户可以从 TokenBank 提取存款

### 1.3 技术栈要求
- **前端框架**: Next.js 16 (App Router + Turbopack)
- **类型系统**: TypeScript
- **样式方案**: Tailwind CSS 4
- **Web3 库**: Wagmi v2 + Viem v2
- **钱包连接**: RainbowKit
- **状态管理**: React Query (TanStack Query)

## 二、当前状态分析

### 2.1 已有资源
- ✅ 智能合约已完成（Foundry 项目）
  - `MyToken.sol` - ERC20 代币合约
  - `TokenBank.sol` - 存取合约
  - 部署脚本已完成
- ✅ 合约 ABI 已生成（位于 `contracts/out/`）
- ✅ 合约部署到本地网络（chainId: 31337）

### 2.2 缺失部分
- ❌ 前端目录和代码完全缺失
- ❌ 需要从合约 ABI 生成 TypeScript 类型
- ❌ 需要完整的 Web3 前端架构

## 三、前端架构设计

### 3.1 项目目录结构

```
frontend/
├── public/                    # 静态资源
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── layout.tsx        # 根布局
│   │   ├── page.tsx          # 首页
│   │   ├── providers.tsx     # Wagmi / RainbowKit / QueryClient Providers
│   │   └── globals.css       # 全局样式 + Tailwind v4 主题变量
│   ├── components/           # React 组件
│   │   └── web3/            # Web3 相关组件
│   │       ├── ConnectWallet.tsx      # 钱包连接按钮
│   │       ├── BalanceCard.tsx        # 钱包余额 / 存款余额 / 授权额度聚合卡片
│   │       ├── DepositForm.tsx        # 存款表单
│   │       ├── WithdrawForm.tsx       # 取款表单
│   │       └── ActivityLog.tsx        # 交易活动记录（Receipts）
│   ├── hooks/               # 自定义 Hooks
│   │   ├── useToken.ts      # Token 相关操作
│   │   └── useTokenBank.ts  # TokenBank 合约交互
│   └── lib/                 # 工具库
│       ├── contracts.ts     # 合约配置（地址、内联 ABI）
│       ├── wagmi.ts         # Wagmi + RainbowKit 配置
│       └── utils.ts         # 通用工具函数
├── .env.local.example       # 环境变量示例
├── next.config.ts           # Next.js 配置（默认启用 Turbopack）
├── postcss.config.js        # Tailwind CSS v4 PostCSS 配置
├── tsconfig.json            # TypeScript 配置
└── package.json             # 依赖配置
```

### 3.2 核心模块设计

#### 3.2.1 Wagmi 配置 (`src/lib/wagmi.ts`)
```typescript
- 配置支持的链（本地链 31337、Sepolia 测试网）
- 配置 transports（HTTP/WebSocket）
- 导出 config 供 Providers 使用
```

#### 3.2.2 合约配置 (`src/lib/contracts.ts`)
```typescript
- 存储合约地址（从环境变量读取）
- 导入合约 ABI（从 contracts/out/ 复制或生成）
- 导出合约实例配置
```

#### 3.2.3 自定义 Hooks

**useToken.ts**
```typescript
- useTokenBalance() - 查询用户 Token 余额
- useTokenAllowance() - 查询对 TokenBank 的授权额度
- useApprove() - 授权 TokenBank 合约
```

**useTokenBank.ts**
```typescript
- useDepositBalance() - 查询用户在 TokenBank 的存款余额
- useDeposit() - 存款操作
- useWithdraw() - 取款操作
```

> 实际代码中未使用独立的 `useContract.ts`，ABI 与地址统一在 `src/lib/contracts.ts` 中管理。

#### 3.2.4 组件设计

**页面结构 (page.tsx)**
```
- Header
  - ConnectWallet（钱包连接按钮）
- 左侧主内容区
  - BalanceCard（聚合显示钱包余额、存款余额、授权额度）
  - DepositForm（存款表单：授权 + 存款）
  - WithdrawForm（取款表单）
- 右侧边栏
  - ActivityLog（交易活动记录 / Receipts）
```

> 实际实现将原设计中的 `TokenBalance`、`DepositBalance`、`AllowanceDisplay` 三个独立组件合并为 `BalanceCard`；并新增了 `ActivityLog` 组件用于展示交易状态与收据。

### 3.3 数据流设计

```
用户操作 → 组件 → 自定义 Hook → Wagmi/Viem → 区块链
                ↓
         React Query（缓存 + 自动刷新）
                ↓
         组件重新渲染
```

**关键数据流：**
1. **读取数据**：使用 `useReadContract` + React Query 自动刷新
2. **写入数据**：使用 `useWriteContract` + `useWaitForTransactionReceipt`
3. **事件监听**：使用 `useWatchContractEvent` 监听 Deposit/Withdraw 事件

### 3.4 合约 ABI 处理方案

**方案：内联 ABI（as const）**

1. 从 `contracts/out/TokenBank.sol/TokenBank.json` 和 `contracts/out/MyToken.sol/MyToken.json` 提取所需 ABI 片段
2. 在 `src/lib/contracts.ts` 中以内联数组形式定义 `myTokenAbi` 与 `tokenBankAbi`，并标注 `as const`
3. 合约地址同样在该文件中管理，优先从环境变量读取，附带 Anvil 默认地址作为 fallback

**原因：**
- 内联 ABI 配合 `as const` 可直接为 Wagmi/Viem 提供类型推断
- 无需额外的 TypeScript 类型生成步骤，减少构建依赖
- ABI 片段精简，只保留前端实际使用的函数、事件和错误，避免冗余

### 3.5 环境变量配置

```bash
# .env.local.example
NEXT_PUBLIC_TOKEN_ADDRESS=0x...      # MyToken 合约地址
NEXT_PUBLIC_TOKENBANK_ADDRESS=0x...  # TokenBank 合约地址
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545  # RPC URL
NEXT_PUBLIC_CHAIN_ID=31337           # 链 ID
```

## 四、实施步骤

### 阶段 1：项目初始化（步骤 1-4）
1. 创建 `frontend` 目录
2. 初始化 Next.js 16 项目（App Router + TypeScript + Turbopack）
3. 安装核心依赖：
   - `next@^16.0.0`, `react@^19.0.0`, `react-dom@^19.0.0`
   - `typescript`, `@types/node`, `@types/react`
   - `tailwindcss@^4.0.0`, `postcss`, `autoprefixer`
4. 安装 Web3 依赖：
   - `wagmi@^2.0.0`, `viem@^2.0.0`
   - `@rainbow-me/rainbowkit@^2.0.0`
   - `@tanstack/react-query@^5.0.0`

### 阶段 2：基础配置（步骤 5-8）
5. 配置 Tailwind CSS 4
6. 配置 Wagmi 和 RainbowKit
7. 创建合约 ABI 和类型定义
8. 配置环境变量

### 阶段 3：核心组件开发（步骤 9-15）
9. 创建基础 UI 组件（Button, Input, Card）
10. 实现钱包连接组件（ConnectWallet）
11. 实现余额显示组件（TokenBalance, DepositBalance）
12. 实现授权显示组件（AllowanceDisplay）
13. 实现存款表单组件（DepositForm）
14. 实现取款表单组件（WithdrawForm）
15. 组装首页（page.tsx）

### 阶段 4：自定义 Hooks 开发（步骤 16-18）
16. 实现 `useToken` Hook（余额、授权、approve）
17. 实现 `useTokenBank` Hook（存款余额、存款、取款）
18. 实现事件监听和自动刷新逻辑

### 阶段 5：测试和优化（步骤 19-20）
19. 本地测试（连接本地 Foundry 节点）
20. 优化用户体验（加载状态、错误提示、交易确认）

## 五、关键技术决策

### 5.1 Next.js 版本选择
**决策：使用 Next.js 16（App Router）**
- 原因：Next.js 16 已发布，默认启用 Turbopack，支持 React 19，符合 PRD 要求
- 使用 App Router 而非 Pages Router（更现代，支持 React Server Components）

### 5.2 状态管理方案
**决策：React Query + Wagmi Hooks**
- 原因：
  - React Query 自动处理缓存、重新获取、乐观更新
  - Wagmi v2 深度集成 React Query
  - 不需要额外的全局状态管理（如 Redux）

### 5.3 合约地址管理
**决策：环境变量 + 配置文件**
- 原因：
  - 不同环境（本地、测试网、主网）使用不同地址
  - 环境变量便于 CI/CD 部署
  - 配置文件提供类型安全的访问

### 5.4 样式方案
**决策：Tailwind CSS 4**
- 原因：
  - 原子化 CSS，开发效率高
  - 与 Next.js 深度集成
  - 符合 PRD 要求

## 六、验证步骤

### 6.1 开发环境验证
- [ ] 启动本地 Foundry 节点：`anvil`
- [ ] 部署合约：`forge script script/Deploy.s.sol`
- [ ] 启动前端：`npm run dev`
- [ ] 访问 http://localhost:3000

### 6.2 功能验证
- [ ] 连接 MetaMask 到本地网络
- [ ] 查看 Token 余额（应为初始供应量）
- [ ] 授权 TokenBank 合约
- [ ] 存款 100 MTK
- [ ] 验证存款余额更新
- [ ] 取款 50 MTK
- [ ] 验证余额变化

### 6.3 边界情况验证
- [ ] 未连接钱包时的提示
- [ ] 授权额度不足时的提示
- [ ] 存款/取款金额为 0 的错误处理
- [ ] 交易失败时的错误提示
- [ ] 网络切换提示

## 七、依赖清单

### 核心依赖

实际 `frontend/package.json` 中的依赖版本如下：

```json
{
  "dependencies": {
    "@rainbow-me/rainbowkit": "^2.2.11",
    "@tanstack/react-query": "^5.101.2",
    "next": "^16.2.10",
    "react": "^19.2.7",
    "react-dom": "^19.2.7",
    "viem": "^2.55.1",
    "wagmi": "^2.19.5"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.3.2",
    "@types/node": "^26.1.1",
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.3",
    "autoprefixer": "^10.5.2",
    "postcss": "^8.5.19",
    "tailwindcss": "^4.3.2",
    "typescript": "^5.9.3"
  }
}
```

## 八、风险与注意事项

### 8.1 技术风险
- **Next.js 16 + Turbopack**：已在实际项目中验证，但第三方包仍需关注兼容性
- **Tailwind CSS 4**：使用 `@tailwindcss/postcss` 与 CSS 变量配置，不再依赖 `tailwind.config.ts`
- **Wagmi v2 breaking changes**：确保使用与 React 19 / Next.js 16 兼容的最新 API

### 8.2 开发注意事项
- **合约地址**：`contracts.ts` 中已内置 Anvil 默认地址作为 fallback，生产环境需通过环境变量覆盖
- **ABI 更新**：合约修改后需同步更新 `src/lib/contracts.ts` 中的内联 ABI
- **网络配置**：本地开发使用自定义链 `anvil`（chainId: 31337），已在 `wagmi.ts` 中配置
- **Gas 估算**：Wagmi 会在交易前自动模拟并估算 Gas，失败时通过 `error` 暴露
- **交易链接**：`ActivityLog` 当前固定链接到 Etherscan，本地网络交易无法查看，后续可按链 ID 动态生成浏览器链接

### 8.3 用户体验优化（已实现）
- 添加加载状态（交易确认中）
- 添加错误提示（授权不足、余额不足、用户拒绝等）
- 添加成功提示（交易成功，Receipts 列表）
- 自动刷新余额（交易完成后通过 `queryClient.invalidateQueries`）
- 余额变动时添加脉冲动画反馈

## 九、总结

本文档已根据实际代码完成校准，当前前端实现：
- 使用 **Next.js 16.2 + React 19 + Turbopack** 构建
- 使用 **Tailwind CSS 4**（`@tailwindcss/postcss`）进行样式管理
- 使用 **Wagmi v2 + Viem v2 + RainbowKit v2** 进行钱包连接与合约交互
- 合约 ABI 以内联 `as const` 形式集中管理于 `src/lib/contracts.ts`
- 组件层面将余额/授权聚合为 `BalanceCard`，并新增 `ActivityLog` 交易记录
- 已实现授权、存款、取款、余额刷新、交易状态反馈等核心功能

文档与代码基本一致，主要差异在于组件拆分粒度与 ABI 管理方式，均已在本版本中修正。
