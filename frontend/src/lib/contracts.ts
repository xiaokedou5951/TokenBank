import { type Address, encodeFunctionData, encodeAbiParameters } from 'viem';

// MyToken ABI (includes ERC20Permit)
export const myTokenAbi = [
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address', internalType: 'address' },
      { name: 'spender', type: 'address', internalType: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address', internalType: 'address' },
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8', internalType: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'symbol',
    inputs: [],
    outputs: [{ name: '', type: 'string', internalType: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'permit',
    inputs: [
      { name: 'owner', type: 'address', internalType: 'address' },
      { name: 'spender', type: 'address', internalType: 'address' },
      { name: 'value', type: 'uint256', internalType: 'uint256' },
      { name: 'deadline', type: 'uint256', internalType: 'uint256' },
      { name: 'v', type: 'uint8', internalType: 'uint8' },
      { name: 'r', type: 'bytes32', internalType: 'bytes32' },
      { name: 's', type: 'bytes32', internalType: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'nonces',
    inputs: [{ name: 'owner', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'DOMAIN_SEPARATOR',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    stateMutability: 'view',
  },
] as const;

// TokenBank ABI
export const tokenBankAbi = [
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'deposit',
    inputs: [{ name: 'amount', type: 'uint256', internalType: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'permitDeposit',
    inputs: [
      { name: 'amount', type: 'uint256', internalType: 'uint256' },
      { name: 'deadline', type: 'uint256', internalType: 'uint256' },
      { name: 'v', type: 'uint8', internalType: 'uint8' },
      { name: 'r', type: 'bytes32', internalType: 'bytes32' },
      { name: 's', type: 'bytes32', internalType: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdraw',
    inputs: [{ name: 'amount', type: 'uint256', internalType: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'Deposit',
    inputs: [
      { name: 'user', type: 'address', indexed: true, internalType: 'address' },
      { name: 'amount', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'PermitDeposit',
    inputs: [
      { name: 'user', type: 'address', indexed: true, internalType: 'address' },
      { name: 'amount', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Withdraw',
    inputs: [
      { name: 'user', type: 'address', indexed: true, internalType: 'address' },
      { name: 'amount', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'ZeroAmount',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ZeroAddress',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InsufficientBalance',
    inputs: [],
  },
  {
    type: 'error',
    name: 'PermitFailed',
    inputs: [],
  },
] as const;

// 合约地址
export const TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_TOKEN_ADDRESS ||
  '0x5FbDB2315678afecb367f032d93F642f64180aa3') as Address;

export const TOKENBANK_ADDRESS = (process.env.NEXT_PUBLIC_TOKENBANK_ADDRESS ||
  '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512') as Address;

// ── EIP-7702 / MetaMask Delegator ─────────────────────────────────────────────

/**
 * MetaMask official EIP-7702 Delegator (EIP7702StatelessDeleGator).
 * Deployed at the same address on mainnet, Sepolia and other supported chains.
 */
export const METAMASK_DELEGATOR_ADDRESS = '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B' as Address;

/** EIP-7702 delegation designator prefix: user.code = 0xef0100 || delegate */
export const EIP7702_DELEGATION_PREFIX = '0xef0100';

/**
 * ERC-7579 BatchDefault mode (callType 0x01 = batch call).
 * Used by the MetaMask Delegator's execute() entrypoint.
 */
export const EXECUTION_MODE_BATCH_DEFAULT =
  '0x0100000000000000000000000000000000000000000000000000000000000000';

/** Minimal ABI of the MetaMask Delegator's ERC-7579 execute entrypoint */
export const metamaskDelegatorAbi = [
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
] as const;

/** A single ERC-7579 Execution passed to the Delegator's execute() */
export interface DelegatorCall {
  to: Address;
  data: `0x${string}`;
  value?: bigint;
}

/**
 * Build calldata for execute(BatchDefault, abi.encode(Execution[])) on the
 * MetaMask Delegator. Used by the 7702 direct path (e2e script / local accounts):
 * the EOA self-calls this calldata in a Type-0x04 transaction whose
 * authorization_list delegates it to METAMASK_DELEGATOR_ADDRESS.
 */
export function buildExecutionBatchCalldata(calls: DelegatorCall[]): `0x${string}` {
  const executions = calls.map((c) => ({
    target: c.to,
    value: c.value ?? 0n,
    callData: c.data,
  }));
  return encodeFunctionData({
    abi: metamaskDelegatorAbi,
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
