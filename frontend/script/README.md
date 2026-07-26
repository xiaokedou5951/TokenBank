# Frontend 部署脚本

本目录包含用于部署智能合约并自动更新前端环境变量的 Shell 脚本。

## 脚本列表

| 脚本 | 说明 |
|------|------|
| `deploy-local.sh` | 部署合约到本地 Anvil 网络，并更新 `.env.local` |

## deploy-local.sh

一键部署合约到本地 Anvil 网络并将合约地址写入 `frontend/.env.local`。

### 前置条件

1. **Foundry** 已安装（`forge` 命令可用）
2. **Anvil** 正在本地运行（`anvil` 命令，默认端口 8545）
3. `contracts/.env` 文件存在（包含 `PRIVATE_KEY` 和 `INITIAL_SUPPLY`）

### 使用方法

```bash
# 从项目根目录执行
bash frontend/script/deploy-local.sh

# 或进入脚本目录执行
cd frontend/script && ./deploy-local.sh
```

### 执行流程

1. 检查 `forge` 命令和 `contracts/.env` 是否可用
2. **部署 Permit2** — 执行 `forge script script/DeployPermit2.s.sol --rpc-url local --broadcast`
3. 从部署输出中解析 Permit2 地址，写入 `contracts/.env` 的 `PERMIT2_ADDRESS`
4. **部署 MyToken + TokenBankPermit2** — 执行 `forge script script/Deploy.s.sol --rpc-url local --broadcast`（从 `contracts/.env` 读取 `PERMIT2_ADDRESS`）
5. 从部署输出中解析合约地址（去除 ANSI 颜色码后匹配）
6. 更新 `frontend/.env.local` 中的以下字段：

| 环境变量 | 合约 |
|----------|------|
| `NEXT_PUBLIC_TOKEN_ADDRESS` | MyToken |
| `NEXT_PUBLIC_TOKENBANK_ADDRESS` | TokenBankPermit2 |
| `NEXT_PUBLIC_PERMIT2_ADDRESS` | Permit2 |
| `NEXT_PUBLIC_RPC_URL` | 重置为 `http://127.0.0.1:8545` |
| `NEXT_PUBLIC_CHAIN_ID` | 重置为 `31337` |

### 地址解析策略

脚本优先从 forge stdout 提取地址，失败时从 broadcast JSON 补充：

1. **grep 解析 forge stdout** — 从 `console.log` 输出提取合约地址（去除 ANSI 颜色码后匹配）
2. **jq 解析 broadcast JSON** — 仅当地址未从 stdout 提取到时补充
3. **grep 解析 broadcast JSON** — jq 不可用时的兜底

### 关于本地部署地址固定不变

每次在 Anvil 上部署，三个合约地址都相同。这是因为：

- Anvil 每次重启后状态重置，部署者 nonce 从 0 开始
- `CREATE` 操作码的地址由 `keccak256(rlp([sender, nonce]))` 决定
- 相同部署者 + 相同 nonce = 相同地址

部署顺序：nonce 0 → Permit2 → nonce 1 → MyToken → nonce 2 → TokenBankPermit2
