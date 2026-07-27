import { type Address } from 'viem';

// MyToken ABI
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
] as const;

// Permit2 ABI (minimal)
export const permit2Abi = [
  {
    type: 'function',
    name: 'nonceBitmap',
    inputs: [
      { name: '', type: 'address', internalType: 'address' },
      { name: '', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'permitTransferFrom',
    inputs: [
      {
        name: 'permit',
        type: 'tuple',
        internalType: 'struct IPermit2.PermitTransferFrom',
        components: [
          {
            name: 'permitted',
            type: 'tuple',
            internalType: 'struct IPermit2.TokenPermissions',
            components: [
              { name: 'token', type: 'address', internalType: 'address' },
              { name: 'amount', type: 'uint256', internalType: 'uint256' },
            ],
          },
          { name: 'nonce', type: 'uint256', internalType: 'uint256' },
          { name: 'deadline', type: 'uint256', internalType: 'uint256' },
        ],
      },
      {
        name: 'transferDetails',
        type: 'tuple',
        internalType: 'struct IPermit2.SignatureTransferDetails',
        components: [
          { name: 'to', type: 'address', internalType: 'address' },
          { name: 'requestedAmount', type: 'uint256', internalType: 'uint256' },
        ],
      },
      { name: 'owner', type: 'address', internalType: 'address' },
      { name: 'signature', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
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
    name: 'depositWithPermit2',
    inputs: [
      {
        name: 'permitTransfer',
        type: 'tuple',
        internalType: 'struct IPermit2.PermitTransferFrom',
        components: [
          {
            name: 'permitted',
            type: 'tuple',
            internalType: 'struct IPermit2.TokenPermissions',
            components: [
              { name: 'token', type: 'address', internalType: 'address' },
              { name: 'amount', type: 'uint256', internalType: 'uint256' },
            ],
          },
          { name: 'nonce', type: 'uint256', internalType: 'uint256' },
          { name: 'deadline', type: 'uint256', internalType: 'uint256' },
        ],
      },
      { name: 'owner', type: 'address', internalType: 'address' },
      { name: 'signature', type: 'bytes', internalType: 'bytes' },
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
    type: 'function',
    name: 'token',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'contract IERC20' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'permit2',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'contract IPermit2' }],
    stateMutability: 'view',
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
    name: 'Permit2Deposit',
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
] as const;

// 合约地址
export const TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_TOKEN_ADDRESS ||
  (() => { throw new Error('Missing required environment variable: NEXT_PUBLIC_TOKEN_ADDRESS'); })()) as Address;

export const TOKENBANK_ADDRESS = (process.env.NEXT_PUBLIC_TOKENBANK_ADDRESS ||
  (() => { throw new Error('Missing required environment variable: NEXT_PUBLIC_TOKENBANK_ADDRESS'); })()) as Address;

export const PERMIT2_ADDRESS = (process.env.NEXT_PUBLIC_PERMIT2_ADDRESS ||
  (() => { throw new Error('Missing required environment variable: NEXT_PUBLIC_PERMIT2_ADDRESS'); })()) as Address;
