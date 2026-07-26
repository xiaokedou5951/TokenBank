# 部署合约并更新 .env.local 的 Shell 脚本计划

## 摘要

在 `/Users/mac/work/2026/web3/TokenBank/frontend/script/` 目录下创建一个 shell 脚本，执行 Foundry 部署合约后，自动解析部署输出中的合约地址，并更新 `frontend/.env.local` 文件。

## 当前状态分析

- **合约部署方式**：使用 Foundry（forge script），部署脚本位于 [Deploy.s.sol](file:///Users/mac/work/2026/web3/TokenBank/contracts/script/Deploy.s.sol)
- **部署输出格式**：forge script 通过 `console.log` 输出合约地址，格式如：
  - `MyTokenPermit deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3`
  - `TokenBankPermit2 deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
  - `Permit2 deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **目标 .env.local** 路径：`/Users/mac/work/2026/web3/TokenBank/frontend/.env.local`
- **.env.local 当前内容**：
  ```
  NEXT_PUBLIC_TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
  NEXT_PUBLIC_TOKENBANK_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
  NEXT_PUBLIC_PERMIT2_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
  NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
  NEXT_PUBLIC_CHAIN_ID=31337
  ```
- **frontend/script 目录**：当前为空目录
- **Foundry 合约目录**：`/Users/mac/work/2026/web3/TokenBank/contracts/`
- **合约 .env**：`/Users/mac/work/2026/web3/TokenBank/contracts/.env`（包含 PRIVATE_KEY 等）

## 提议变更

### 1. 创建 `frontend/script/deploy-local.sh`

**目的**：一键部署合约到本地 Anvil 网络并自动更新前端环境变量

**脚本逻辑**：

1. **检查前置条件**：确认 `forge` 命令可用、`contracts/.env` 存在
2. **执行部署**：在 `contracts/` 目录下运行 `forge script script/Deploy.s.sol --rpc-url local --broadcast`
3. **解析输出**：从 forge 部署输出中提取三个合约地址：
   - `MyTokenPermit deployed to: <address>` → `NEXT_PUBLIC_TOKEN_ADDRESS`
   - `TokenBankPermit2 deployed to: <address>` → `NEXT_PUBLIC_TOKENBANK_ADDRESS`
   - `Permit2 deployed to: <address>` → `NEXT_PUBLIC_PERMIT2_ADDRESS`
4. **更新 .env.local**：使用 `sed` 替换对应的行，保留 `NEXT_PUBLIC_RPC_URL` 和 `NEXT_PUBLIC_CHAIN_ID` 不变
5. **输出结果**：打印更新后的地址信息

**关键实现细节**：
- 脚本从 forge 的 broadcast JSON 文件（`contracts/broadcast/Deploy.s.sol/31337/run-latest.json`）中解析合约地址，这比解析 console.log 输出更可靠
- 备用方案：如果 broadcast JSON 不可用，则从 forge 的 stdout 输出中 grep 地址
- 使用 `sed -i ''` (macOS 兼容) 替换 .env.local 中的地址

### 2. 创建 `frontend/script/deploy-sepolia.sh`

**目的**：部署到 Sepolia 测试网并更新前端环境变量（包含 RPC_URL 和 CHAIN_ID 的切换）

**与 local 版本的差异**：
- 使用 `--rpc-url sepolia`
- 同时更新 `NEXT_PUBLIC_RPC_URL` 和 `NEXT_PUBLIC_CHAIN_ID=11155111`

## 假设与决策

1. **只创建 `deploy-local.sh`**：当前主要需求是本地部署，sepolia 脚本可后续按需添加
2. **地址提取方式**：优先从 forge broadcast JSON 文件解析，因为它结构化且可靠；fallback 到 grep stdout
3. **macOS 兼容**：使用 `sed -i ''` 和 `gsed` 检测
4. **保留非地址字段**：`RPC_URL` 和 `CHAIN_ID` 在本地部署时保持不变

## 验证步骤

1. 确保 Anvil 在本地运行（`anvil` 命令）
2. 执行 `cd frontend/script && bash deploy-local.sh`
3. 检查 `frontend/.env.local` 中的地址是否已更新为最新部署的合约地址
4. 启动前端 `npm run dev`，验证连接正常
