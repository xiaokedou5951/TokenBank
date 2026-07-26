# 前端集成 Permit2 签名存款

## 概述

将前端从旧的 EIP-2612 Permit 签名存款方式迁移到 Uniswap Permit2 签名存款方式，与合约 `TokenBankPermit2.depositWithPermit2()` 对接。

## 现状分析

### 合约侧（已完成）
- `TokenBankPermit2.sol` 提供 `depositWithPermit2(PermitTransferFrom, owner, signature)` 方法
- 使用 Permit2 的 `permitTransferFrom` 进行签名授权转账
- 需要 Permit2 合约地址

### 前端侧（需要修改）
- 当前使用 **EIP-2612 Permit**（MyTokenPermit 自带的 permit），调用 `permitDeposit(amount, deadline, v, r, s)`
- 这与合约的 `depositWithPermit2` 签名不匹配
- 需要迁移到 **Permit2** 签名流程

### Permit2 签名流程
1. 用户先 `approve` Permit2 合约来管理其代币（一次性操作）
2. 用户签名一个 `PermitTransferFrom` EIP-712 消息
3. 调用 `depositWithPermit2(permitTransfer, owner, signature)` 完成存款

### Permit2 EIP-712 签名结构
- **Domain**: `{ name: "Permit2", chainId, verifyingContract: PERMIT2_ADDRESS }`
- **Types**:
  ```
  PermitTransferFrom: [
    { name: "permitted", type: "TokenPermissions" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" }
  ]
  TokenPermissions: [
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" }
  ]
  ```

## 修改计划

### 1. `src/lib/contracts.ts` — 更新 ABI 和地址
- **移除**: `tokenBankAbi` 中的 `permitDeposit` 函数定义
- **添加**: `tokenBankAbi` 中的 `depositWithPermit2` 函数定义（参数: `permitTransfer` (tuple), `owner` (address), `signature` (bytes)）
- **添加**: `PERMIT2_ADDRESS` 常量（从环境变量 `NEXT_PUBLIC_PERMIT2_ADDRESS` 读取，默认本地部署地址 `0x5FbDB2315678afecb367f032d93F642f64180aa3`）
- **添加**: `permit2Abi` — Permit2 合约的最小 ABI（`nonceBitmap`, `permitTransferFrom`, `DOMAIN_SEPARATOR`）
- **添加**: `PERMIT2Deposit` event 到 tokenBankAbi
- **移除**: `PermitFailed` error（合约已不使用），添加 `Invalid token` error

### 2. `src/hooks/useToken.ts` — 替换签名逻辑
- **移除**: `usePermitSignature`（EIP-2612 签名）
- **移除**: `useTokenNonce`（Permit2 使用 bitmap nonce，不使用递增 nonce）
- **添加**: `usePermit2Allowance(address)` — 查询用户对 Permit2 合约的 token 授权额度
- **添加**: `useApprovePermit2()` — 授权 Permit2 合约管理代币（`approve(PERMIT2_ADDRESS, MAX_UINT256)`）
- **添加**: `usePermit2Signature()` — 生成 Permit2 EIP-712 签名
  - 使用 `useSignTypedData` 签名 `PermitTransferFrom` 消息
  - Domain: `{ name: "Permit2", version: "0", chainId, verifyingContract: PERMIT2_ADDRESS }`
  - 生成随机 nonce（使用时间戳 + 随机数避免碰撞）

### 3. `src/hooks/useTokenBank.ts` — 替换存款逻辑
- **移除**: `usePermitDeposit()`（旧的 EIP-2612 permitDeposit）
- **添加**: `usePermit2Deposit()` — 调用 `depositWithPermit2`
  - 参数: `(permitTransfer: { permitted: { token, amount }, nonce, deadline }, owner, signature)`
  - 使用 `writeContract` 调用 `depositWithPermit2`

### 4. `src/components/web3/DepositForm.tsx` — 更新 UI 交互
- **移除**: EIP-2612 相关逻辑（`handlePermitDeposit`, nonce 读取, v/r/s 拆分等）
- **添加**: Permit2 存款流程:
  1. 检查用户是否已授权 Permit2（`usePermit2Allowance`）
  2. 若未授权，显示 "Approve Permit2" 按钮（`useApprovePermit2`）
  3. 授权完成后，"Permit2 Deposit" 按钮变为可用
  4. 点击后：生成 Permit2 签名 → 调用 `depositWithPermit2`
- **更新**: ActivityLog 中的状态提示（"Signing permit2..." → "Submitting deposit..."）
- **保留**: 传统 Approve + Deposit 流程不变
- **更新**: 按钮文案和提示信息

### 5. `.env.local.example` — 添加 Permit2 地址
- **添加**: `NEXT_PUBLIC_PERMIT2_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3`

### 6. `src/components/web3/BalanceCard.tsx` — 无需修改
- Allowance 仍查询对 TokenBank 的授权，与 Permit2 流程无关

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/lib/contracts.ts` | 修改 | 更新 ABI、添加 Permit2 地址和 ABI |
| `src/hooks/useToken.ts` | 修改 | 移除 EIP-2612 签名、添加 Permit2 签名和授权 |
| `src/hooks/useTokenBank.ts` | 修改 | 移除旧 permitDeposit、添加 depositWithPermit2 |
| `src/components/web3/DepositForm.tsx` | 修改 | 更新为 Permit2 交互流程 |
| `.env.local.example` | 修改 | 添加 NEXT_PUBLIC_PERMIT2_ADDRESS |

## 验证步骤

1. 启动 Anvil 本地链，部署合约（Permit2 + MyTokenPermit + TokenBankPermit2）
2. 启动前端 `npm run dev`
3. 连接钱包，测试传统 Approve + Deposit 流程正常
4. 测试 Permit2 存款流程:
   - 首次使用需先 Approve Permit2
   - 签名 Permit2 消息
   - 调用 depositWithPermit2 成功存款
5. 验证余额更新正确
