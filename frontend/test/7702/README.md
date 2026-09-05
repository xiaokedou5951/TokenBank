# EIP-7702 浏览器 MetaMask 验证测试

本目录存放 TokenBank EIP-7702 智能存款（Smart Deposit）的浏览器端到端测试记录。

## 测试证据

| 文件 | 说明 |
|---|---|
| `测试-7702-浏览器MetaMask验证.png` | 真实 Sepolia 上通过 MetaMask 完成 7702 一键存款的 UI 验证截图 |

## 测试环境

| 项 | 值 |
|---|---|
| 网络 | 真实 Sepolia（chainId `11155111`） |
| 钱包 | MetaMask（已开启智能账户） |
| 测试日期 | 2026-09-05 |
| MyTokenPermit | `0x7cec23f21E79dF9f7732253935d8e6035f77Fe99`（[部署交易](https://sepolia.etherscan.io/tx/0xcf53b8f22a8de6e5e8e1ca0d5b32735bac15a9de96d3e1b430b8d078f0d6d429)） |
| TokenBankPermit | `0x471Af68D7c357feab1a139d82Dc6cfF3487BE9a5`（[部署交易](https://sepolia.etherscan.io/tx/0xc9a5cd155e87f0033c08e466e3818f2fed3d1d050e61c5f018c7cf098e21971f)） |
| 部署账户 | `0xa85a50540fceb29891a28ab228f47250e935dc89` |

合约通过 `forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast` 部署，
并通过 `BENEFICIARY_ADDRESS` 向测试用 MetaMask 账户发放了测试代币。

## 测试步骤

1. **部署合约**：MyTokenPermit + TokenBankPermit 部署到真实 Sepolia，部署日志输出
   `EIP-7702 delegator detected: ready for 7702 flow`（确认链上存在 MetaMask 官方 Delegator
   `0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B`）
2. **配置前端**：`frontend/.env.local` 写入上述两个合约地址
3. **准备钱包**：MetaMask 切换到内置 Sepolia 网络；账户详情中开启智能账户（升级）
4. **执行存款**：UI 输入金额 → 点击「⚡ Smart Deposit (One-Click)」→ MetaMask 中一次签名确认
5. **截图存证**：保存 UI 验证结果截图（本目录 PNG）

## 验证要点

- [x] 一次签名、一笔交易完成「EIP-7702 委托 + ERC20 授权 + 存款」
- [x] Receipts 面板仅一条交易记录（原子批量，无独立的 approve 交易）
- [x] Deposited 余额增加、Allowance 归零（approve 即用即销）
- [x] 委托状态徽章显示 `Delegated → MetaMask 0x63c0…`，BalanceCard 显示 `Smart Account`
- [x] 交易在 sepolia.etherscan.io 上为 EIP-7702 类型（可见 Authorization List 与 `0x63c0...32B`）

## 关联文档

- 测试流程手册：[docs/dev/EIP-7702指南.md](../../../docs/dev/EIP-7702指南.md) 第五节
- 脚本级 E2E（本地 fork，无需 MetaMask）：[frontend/scripts/e2e-7702.mjs](../scripts/e2e-7702.mjs)
- 合约回归测试（真实 Delegator 字节码）：[contracts/test/TokenBank7702.t.sol](../../../contracts/test/TokenBank7702.t.sol)

## 备注

浏览器验证**必须使用真实 Sepolia**：MetaMask 添加自定义网络时 Chain ID 由 RPC 自动检测、
无法手动指定，本地 fork（chainId `11155111`）与内置 Sepolia 网络冲突无法添加。本地 fork
仅用于脚本级验证（`e2e-7702.mjs` 通过 `RPC_URL` 直连，无需钱包）。
