#!/usr/bin/env node
/**
 * EIP-7702 end-to-end verification for TokenBank (direct Type-0x04 path).
 *
 * Simulates exactly what MetaMask does for a "Smart Deposit":
 *   1. Sign an EIP-7702 authorization delegating the EOA to the official
 *      MetaMask Delegator (0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B).
 *   2. Send ONE Type-0x04 transaction:
 *        to                = the EOA itself
 *        data              = execute(BatchDefault, [approve(tokenBank, amount), deposit(amount)])
 *        authorizationList = [the signed authorization]
 *   3. Assert on-chain effects: deposit credited, allowance consumed,
 *      delegation designator (0xef0100 || delegator) in place.
 *
 * Requires the MetaMask Delegator to exist on the target chain:
 * run against a Sepolia fork (`anvil --fork-url <SEPOLIA_RPC>`) or real Sepolia.
 *
 * Usage:
 *   cd frontend
 *   RPC_URL=http://127.0.0.1:8545 \
 *   PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
 *   TOKEN_ADDRESS=0x... TOKENBANK_ADDRESS=0x... \
 *   node scripts/e2e-7702.mjs
 *
 * Optional:
 *   AMOUNT      deposit amount in whole tokens (default: 1)
 */

import assert from 'node:assert/strict';
import { createPublicClient, createWalletClient, http, encodeFunctionData, encodeAbiParameters } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

// ── Configuration ─────────────────────────────────────────────────────────────

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;
const TOKENBANK_ADDRESS = process.env.TOKENBANK_ADDRESS;
const AMOUNT_TOKENS = process.env.AMOUNT ? Number(process.env.AMOUNT) : 1;

const METAMASK_DELEGATOR = '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B';
const EXECUTION_MODE_BATCH_DEFAULT = '0x0100000000000000000000000000000000000000000000000000000000000000';
const DELEGATION_PREFIX = '0xef0100';

const erc20Abi = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
];

const tokenBankAbi = [
  {
    type: 'function',
    name: 'deposit',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
];

// ── Delegator batch calldata (mirrors frontend/src/lib/contracts.ts) ─────────

const delegatorExecuteAbi = [
  {
    type: 'function',
    name: 'execute',
    inputs: [
      { name: '_mode', type: 'bytes32', internalType: 'ModeCode' },
      { name: '_executionCalldata', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
];

function buildExecutionBatchCalldata(calls) {
  const executions = calls.map((c) => ({ target: c.to, value: c.value ?? 0n, callData: c.data }));
  return encodeFunctionData({
    abi: delegatorExecuteAbi,
    functionName: 'execute',
    args: [
      EXECUTION_MODE_BATCH_DEFAULT,
      encodeAbiParameters(
        [
          {
            type: 'tuple[]',
            components: [
              { name: 'target', type: 'address' },
              { name: 'value', type: 'uint256' },
              { name: 'callData', type: 'bytes' },
            ],
          },
        ],
        [executions],
      ),
    ],
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!RPC_URL || !PRIVATE_KEY || !TOKEN_ADDRESS || !TOKENBANK_ADDRESS) {
    console.error(
      'Missing env vars. Required: RPC_URL, PRIVATE_KEY, TOKEN_ADDRESS, TOKENBANK_ADDRESS. Optional: AMOUNT.'
    );
    process.exit(1);
  }

  const account = privateKeyToAccount(PRIVATE_KEY);
  const transport = http(RPC_URL);

  const publicClient = createPublicClient({ transport });
  const walletClient = createWalletClient({ account, transport });

  const chainId = await publicClient.getChainId();
  const amount = BigInt(AMOUNT_TOKENS) * 10n ** 18n;

  console.log('── TokenBank EIP-7702 E2E ──────────────────────────────');
  console.log(`RPC:            ${RPC_URL}`);
  console.log(`Chain ID:       ${chainId}`);
  console.log(`EOA:            ${account.address}`);
  console.log(`Delegator:      ${METAMASK_DELEGATOR}`);
  console.log(`Token:          ${TOKEN_ADDRESS}`);
  console.log(`TokenBank:      ${TOKENBANK_ADDRESS}`);
  console.log(`Amount:         ${AMOUNT_TOKENS} MTK`);
  console.log('');

  // 0. Preflight: delegator must exist on this chain
  const delegatorCode = await publicClient.getCode({ address: METAMASK_DELEGATOR });
  assert.ok(delegatorCode && delegatorCode !== '0x', 'MetaMask Delegator not found on this chain (use a Sepolia fork)');

  const userTokenBefore = await publicClient.readContract({
    address: TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account.address],
  });
  const bankBefore = await publicClient.readContract({
    address: TOKENBANK_ADDRESS,
    abi: tokenBankAbi,
    functionName: 'balanceOf',
    args: [account.address],
  });
  assert.ok(userTokenBefore >= amount, `insufficient token balance: ${userTokenBefore}`);
  console.log(`Bank balance before: ${bankBefore}`);

  // 1. Sign the EIP-7702 authorization (executor: 'self' → nonce = account nonce + 1)
  console.log('\n1. Signing EIP-7702 authorization…');
  const authorization = await walletClient.signAuthorization({
    account,
    contractAddress: METAMASK_DELEGATOR,
    executor: 'self',
  });
  console.log(`   nonce=${authorization.nonce} chainId=${authorization.chainId}`);

  // 2. Build the batch: [approve(bank, amount), deposit(amount)]
  const data = buildExecutionBatchCalldata([
    {
      to: TOKEN_ADDRESS,
      data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [TOKENBANK_ADDRESS, amount] }),
    },
    {
      to: TOKENBANK_ADDRESS,
      data: encodeFunctionData({ abi: tokenBankAbi, functionName: 'deposit', args: [amount] }),
    },
  ]);

  // 3. Send ONE Type-0x04 transaction: to = EOA itself, with authorizationList
  console.log('\n2. Sending single Type-0x04 transaction (delegation + approve + deposit)…');
  const hash = await walletClient.sendTransaction({
    account,
    to: account.address,
    data,
    authorizationList: [authorization],
    chain: null,
    gas: 500_000n,
  });
  console.log(`   tx: ${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  assert.equal(receipt.status, 'success', `transaction reverted (status=${receipt.status})`);
  // viem reports EIP-7702 receipts as type 'eip7702' (raw: 0x4)
  assert.ok(
    receipt.type === 'eip7702' || receipt.type === '0x4',
    `expected Type-0x4 (EIP-7702) transaction, got ${receipt.type}`
  );
  console.log(`   confirmed in block ${receipt.blockNumber}, type=${receipt.type}, gas=${receipt.gasUsed}`);

  // 4. Assertions
  console.log('\n3. Verifying on-chain state…');

  const bankAfter = await publicClient.readContract({
    address: TOKENBANK_ADDRESS,
    abi: tokenBankAbi,
    functionName: 'balanceOf',
    args: [account.address],
  });
  assert.equal(bankAfter, bankBefore + amount, 'bank balance must increase by deposit amount');
  console.log(`   ✓ deposit credited: ${bankBefore} → ${bankAfter}`);

  const allowance = await publicClient.readContract({
    address: TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [account.address, TOKENBANK_ADDRESS],
  });
  assert.equal(allowance, 0n, 'allowance must be fully consumed (exact-amount approve)');
  console.log('   ✓ allowance fully consumed (0)');

  const code = await publicClient.getCode({ address: account.address });
  const expectedDesignator = DELEGATION_PREFIX + METAMASK_DELEGATOR.slice(2).toLowerCase();
  assert.equal(
    (code ?? '').toLowerCase(),
    expectedDesignator,
    'EOA code must be the 0xef0100 designator pointing at the MetaMask Delegator'
  );
  console.log('   ✓ delegation designator in place: 0xef0100 || 0x63c0…32B');

  console.log('\nPASS: EIP-7702 one-tx deposit verified (Type-4 tx, atomic approve+deposit, delegated EOA).');
  console.log(`Tx: ${hash}`);
}

main().catch((err) => {
  console.error('\nFAIL:', err.message ?? err);
  process.exit(1);
});
