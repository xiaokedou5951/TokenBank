#!/bin/bash
# 部署合约到本地 Anvil 网络，并将合约地址更新到 frontend/.env.local
# 流程：1) 部署 Permit2  2) 更新 contracts/.env  3) 部署 MyTokenPermit + TokenBankPermit2  4) 更新 frontend/.env.local

set -euo pipefail

# 项目根目录（脚本所在目录的上两级）
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CONTRACTS_DIR="$PROJECT_ROOT/contracts"
ENV_FILE="$PROJECT_ROOT/frontend/.env.local"
CONTRACTS_ENV="$CONTRACTS_DIR/.env"
CHAIN_ID=31337

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# macOS 兼容的 sed -i
update_env() {
    local key="$1"
    local value="$2"
    local file="$3"

    if grep -q "^${key}=" "$file"; then
        sed -i '' "s|^${key}=.*|${key}=${value}|" "$file"
    else
        echo "${key}=${value}" >> "$file"
    fi
}

# 从 forge 部署输出中提取指定合约地址
# 用法: extract_address "$output" "合约名 deployed to:"
extract_address() {
    local output="$1"
    local pattern="$2"
    local clean
    clean=$(echo "$output" | sed 's/\x1b\[[0-9;]*m//g')
    echo "$clean" | grep -oE "${pattern} 0x[0-9a-fA-F]{40}" | grep -oE '0x[0-9a-fA-F]{40}' | head -1 || true
}

# === 1. 前置检查 ===
log_info "检查前置条件..."

if ! command -v forge &>/dev/null; then
    log_error "forge 未安装，请先安装 Foundry: https://book.getfoundry.sh/getting-started/installation"
    exit 1
fi

if [ ! -f "$CONTRACTS_ENV" ]; then
    log_error "contracts/.env 文件不存在: $CONTRACTS_ENV"
    exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
    log_warn ".env.local 不存在，将从 .env.local.example 创建: $ENV_FILE"
    cp "$PROJECT_ROOT/frontend/.env.local.example" "$ENV_FILE"
fi

cd "$CONTRACTS_DIR"

# === 2. 部署 Permit2 合约 ===
log_info "部署 Permit2 合约到本地网络 (chainId: $CHAIN_ID)..."

PERMIT2_OUTPUT=$(forge script script/DeployPermit2.s.sol --rpc-url local --broadcast 2>&1) || {
    log_error "Permit2 合约部署失败！"
    echo "$PERMIT2_OUTPUT"
    exit 1
}

echo "$PERMIT2_OUTPUT"

PERMIT2_ADDRESS=$(extract_address "$PERMIT2_OUTPUT" "Permit2 deployed to:")

# fallback: 从 broadcast JSON 解析 Permit2 地址
PERMIT2_BROADCAST_DIR="$CONTRACTS_DIR/broadcast/DeployPermit2.s.sol/$CHAIN_ID"
if [ -z "$PERMIT2_ADDRESS" ] && [ -f "$PERMIT2_BROADCAST_DIR/run-latest.json" ]; then
    log_info "stdout 未找到 Permit2 地址，尝试从 broadcast JSON 解析..."
    if command -v jq &>/dev/null; then
        PERMIT2_ADDRESS=$(jq -r '.contracts[] | select(.contractName == "Permit2") | .address' "$PERMIT2_BROADCAST_DIR/run-latest.json" 2>/dev/null | head -1 || true)
    fi
    [ -z "$PERMIT2_ADDRESS" ] && PERMIT2_ADDRESS=$(grep -o '"Permit2"[^}]*"address"[[:space:]]*:[[:space:]]*"[^"]*"' "$PERMIT2_BROADCAST_DIR/run-latest.json" | grep -o '0x[0-9a-fA-F]\{40\}' | head -1 || true)
fi

if [ -z "$PERMIT2_ADDRESS" ]; then
    log_error "无法解析 Permit2 合约地址！"
    exit 1
fi

log_info "Permit2 合约地址: $PERMIT2_ADDRESS"

# 将 Permit2 地址写入 contracts/.env，供后续 Deploy.s.sol 读取
update_env "PERMIT2_ADDRESS" "$PERMIT2_ADDRESS" "$CONTRACTS_ENV"
log_info "已更新 $CONTRACTS_ENV 中的 PERMIT2_ADDRESS"

# === 3. 部署 MyTokenPermit + TokenBankPermit2 ===
log_info "部署 MyTokenPermit 和 TokenBankPermit2 合约..."

DEPLOY_OUTPUT=$(forge script script/Deploy.s.sol --rpc-url local --broadcast 2>&1) || {
    log_error "合约部署失败！"
    echo "$DEPLOY_OUTPUT"
    exit 1
}

echo "$DEPLOY_OUTPUT"

TOKEN_ADDRESS=$(extract_address "$DEPLOY_OUTPUT" "MyTokenPermit deployed to:")
TOKENBANK_ADDRESS=$(extract_address "$DEPLOY_OUTPUT" "TokenBankPermit2 deployed to:")

# fallback: 从 broadcast JSON 解析
BROADCAST_FILE="$CONTRACTS_DIR/broadcast/Deploy.s.sol/$CHAIN_ID/run-latest.json"
if [ -f "$BROADCAST_FILE" ] && { [ -z "$TOKEN_ADDRESS" ] || [ -z "$TOKENBANK_ADDRESS" ]; }; then
    log_info "stdout 解析不完整，尝试从 broadcast JSON 补充..."
    if command -v jq &>/dev/null; then
        ADDRESSES=$(jq -r '.contracts[] | "\(.contractName): \(.address)"' "$BROADCAST_FILE" 2>/dev/null || true)
        if [ -z "$ADDRESSES" ]; then
            ADDRESSES=$(jq -r '.transactions[] | select(.transactionType == "CREATE") | "\(.contractName // "Unknown"): \(.contractAddress)"' "$BROADCAST_FILE" 2>/dev/null || true)
        fi
        while IFS=': ' read -r name addr; do
            addr=$(echo "$addr" | xargs)
            case "$name" in
                *MyTokenPermit*)    [ -z "$TOKEN_ADDRESS" ] && TOKEN_ADDRESS="$addr" ;;
                *TokenBankPermit2*) [ -z "$TOKENBANK_ADDRESS" ] && TOKENBANK_ADDRESS="$addr" ;;
            esac
        done <<< "$ADDRESSES"
    fi
    # grep 兜底
    [ -z "$TOKEN_ADDRESS" ] && TOKEN_ADDRESS=$(grep -o '"MyTokenPermit"[^}]*"address"[[:space:]]*:[[:space:]]*"[^"]*"' "$BROADCAST_FILE" | grep -o '0x[0-9a-fA-F]\{40\}' | head -1 || true)
    [ -z "$TOKENBANK_ADDRESS" ] && TOKENBANK_ADDRESS=$(grep -o '"TokenBankPermit2"[^}]*"address"[[:space:]]*:[[:space:]]*"[^"]*"' "$BROADCAST_FILE" | grep -o '0x[0-9a-fA-F]\{40\}' | head -1 || true)
fi

# 校验地址
if [ -z "$TOKEN_ADDRESS" ] || [ -z "$TOKENBANK_ADDRESS" ]; then
    log_error "无法解析合约地址！"
    log_error "  TOKEN_ADDRESS: ${TOKEN_ADDRESS:-未找到}"
    log_error "  TOKENBANK_ADDRESS: ${TOKENBANK_ADDRESS:-未找到}"
    exit 1
fi

log_info "解析到合约地址:"
log_info "  MyTokenPermit:    $TOKEN_ADDRESS"
log_info "  TokenBankPermit2: $TOKENBANK_ADDRESS"
log_info "  Permit2:          $PERMIT2_ADDRESS"

# === 4. 更新 frontend/.env.local ===
log_info "更新 $ENV_FILE ..."

update_env "NEXT_PUBLIC_TOKEN_ADDRESS" "$TOKEN_ADDRESS" "$ENV_FILE"
update_env "NEXT_PUBLIC_TOKENBANK_ADDRESS" "$TOKENBANK_ADDRESS" "$ENV_FILE"
update_env "NEXT_PUBLIC_PERMIT2_ADDRESS" "$PERMIT2_ADDRESS" "$ENV_FILE"

# 确保 RPC 和 CHAIN_ID 正确（本地部署场景）
update_env "NEXT_PUBLIC_RPC_URL" "http://127.0.0.1:8545" "$ENV_FILE"
update_env "NEXT_PUBLIC_CHAIN_ID" "$CHAIN_ID" "$ENV_FILE"

# === 5. 输出结果 ===
log_info "部署完成！.env.local 已更新:"
echo ""
cat "$ENV_FILE"
echo ""
