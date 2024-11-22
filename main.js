const { ethers, BigNumber } = require("ethers");
const {
  computeFirstTradeQtyIn,
  ratioApproxEq,
  applyKConstRuleOut,
} = require("./library");

// Replace with actual values
const BSC_URL = "https://binance.llamarpc.com";
const SMARDEX_PAIR_ADDRESS = "0xe7b89CbD4E833510F393CCfbE7D433EDbb137aB2";
const SMARDEX_ROUTER_ADDRESS = "0xaB3699B71e89a53c529eC037C3389B5A2Caf545A";

const SMARDEX_ROUTER_ABI = [
  {
    inputs: [
      { internalType: "address", name: "_factory", type: "address" },
      { internalType: "address", name: "_WETH", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "WETH",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "tokenA", type: "address" },
          { internalType: "address", name: "tokenB", type: "address" },
          { internalType: "uint256", name: "amountADesired", type: "uint256" },
          { internalType: "uint256", name: "amountBDesired", type: "uint256" },
          { internalType: "uint256", name: "amountAMin", type: "uint256" },
          { internalType: "uint256", name: "amountBMin", type: "uint256" },
          { internalType: "uint128", name: "fictiveReserveB", type: "uint128" },
          {
            internalType: "uint128",
            name: "fictiveReserveAMin",
            type: "uint128",
          },
          {
            internalType: "uint128",
            name: "fictiveReserveAMax",
            type: "uint128",
          },
        ],
        internalType: "struct ISmardexRouter.AddLiquidityParams",
        name: "_params",
        type: "tuple",
      },
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "addLiquidity",
    outputs: [
      { internalType: "uint256", name: "amountA_", type: "uint256" },
      { internalType: "uint256", name: "amountB_", type: "uint256" },
      { internalType: "uint256", name: "liquidity_", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "token", type: "address" },
          {
            internalType: "uint256",
            name: "amountTokenDesired",
            type: "uint256",
          },
          { internalType: "uint256", name: "amountTokenMin", type: "uint256" },
          { internalType: "uint256", name: "amountETHMin", type: "uint256" },
          {
            internalType: "uint128",
            name: "fictiveReserveETH",
            type: "uint128",
          },
          {
            internalType: "uint128",
            name: "fictiveReserveTokenMin",
            type: "uint128",
          },
          {
            internalType: "uint128",
            name: "fictiveReserveTokenMax",
            type: "uint128",
          },
        ],
        internalType: "struct ISmardexRouter.AddLiquidityETHParams",
        name: "_params",
        type: "tuple",
      },
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "addLiquidityETH",
    outputs: [
      { internalType: "uint256", name: "amountToken_", type: "uint256" },
      { internalType: "uint256", name: "amountETH_", type: "uint256" },
      { internalType: "uint256", name: "liquidity_", type: "uint256" },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "factory",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "uint256", name: "amount", type: "uint256" },
          { internalType: "uint256", name: "reserveIn", type: "uint256" },
          { internalType: "uint256", name: "reserveOut", type: "uint256" },
          {
            internalType: "uint256",
            name: "fictiveReserveIn",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "fictiveReserveOut",
            type: "uint256",
          },
          { internalType: "uint256", name: "priceAverageIn", type: "uint256" },
          { internalType: "uint256", name: "priceAverageOut", type: "uint256" },
          { internalType: "uint128", name: "feesLP", type: "uint128" },
          { internalType: "uint128", name: "feesPool", type: "uint128" },
        ],
        internalType: "struct SmardexLibrary.GetAmountParameters",
        name: "_param",
        type: "tuple",
      },
    ],
    name: "getAmountIn",
    outputs: [
      { internalType: "uint256", name: "amountIn_", type: "uint256" },
      { internalType: "uint256", name: "newReserveIn_", type: "uint256" },
      { internalType: "uint256", name: "newReserveOut_", type: "uint256" },
      {
        internalType: "uint256",
        name: "newFictiveReserveIn_",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "newFictiveReserveOut_",
        type: "uint256",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_amountOut", type: "uint256" },
      { internalType: "address", name: "_tokenIn", type: "address" },
      { internalType: "address", name: "_tokenOut", type: "address" },
    ],
    name: "getAmountInFromPair",
    outputs: [
      { internalType: "uint256", name: "amountIn_", type: "uint256" },
      { internalType: "uint256", name: "newReserveIn_", type: "uint256" },
      { internalType: "uint256", name: "newReserveOut_", type: "uint256" },
      {
        internalType: "uint256",
        name: "newFictiveReserveIn_",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "newFictiveReserveOut_",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "uint256", name: "amount", type: "uint256" },
          { internalType: "uint256", name: "reserveIn", type: "uint256" },
          { internalType: "uint256", name: "reserveOut", type: "uint256" },
          {
            internalType: "uint256",
            name: "fictiveReserveIn",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "fictiveReserveOut",
            type: "uint256",
          },
          { internalType: "uint256", name: "priceAverageIn", type: "uint256" },
          { internalType: "uint256", name: "priceAverageOut", type: "uint256" },
          { internalType: "uint128", name: "feesLP", type: "uint128" },
          { internalType: "uint128", name: "feesPool", type: "uint128" },
        ],
        internalType: "struct SmardexLibrary.GetAmountParameters",
        name: "_param",
        type: "tuple",
      },
    ],
    name: "getAmountOut",
    outputs: [
      { internalType: "uint256", name: "amountOut_", type: "uint256" },
      { internalType: "uint256", name: "newReserveIn_", type: "uint256" },
      { internalType: "uint256", name: "newReserveOut_", type: "uint256" },
      {
        internalType: "uint256",
        name: "newFictiveReserveIn_",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "newFictiveReserveOut_",
        type: "uint256",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_amountIn", type: "uint256" },
      { internalType: "address", name: "_tokenIn", type: "address" },
      { internalType: "address", name: "_tokenOut", type: "address" },
    ],
    name: "getAmountOutFromPair",
    outputs: [
      { internalType: "uint256", name: "amountOut_", type: "uint256" },
      { internalType: "uint256", name: "newReserveIn_", type: "uint256" },
      { internalType: "uint256", name: "newReserveOut_", type: "uint256" },
      {
        internalType: "uint256",
        name: "newFictiveReserveIn_",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "newFictiveReserveOut_",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_amountA", type: "uint256" },
      { internalType: "uint256", name: "_reserveA", type: "uint256" },
      { internalType: "uint256", name: "_reserveB", type: "uint256" },
    ],
    name: "quote",
    outputs: [{ internalType: "uint256", name: "amountB_", type: "uint256" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_tokenA", type: "address" },
      { internalType: "address", name: "_tokenB", type: "address" },
      { internalType: "uint256", name: "_liquidity", type: "uint256" },
      { internalType: "uint256", name: "_amountAMin", type: "uint256" },
      { internalType: "uint256", name: "_amountBMin", type: "uint256" },
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "removeLiquidity",
    outputs: [
      { internalType: "uint256", name: "amountA_", type: "uint256" },
      { internalType: "uint256", name: "amountB_", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_token", type: "address" },
      { internalType: "uint256", name: "_liquidity", type: "uint256" },
      { internalType: "uint256", name: "_amountTokenMin", type: "uint256" },
      { internalType: "uint256", name: "_amountETHMin", type: "uint256" },
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "removeLiquidityETH",
    outputs: [
      { internalType: "uint256", name: "amountToken_", type: "uint256" },
      { internalType: "uint256", name: "amountETH_", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_token", type: "address" },
      { internalType: "uint256", name: "_liquidity", type: "uint256" },
      { internalType: "uint256", name: "_amountTokenMin", type: "uint256" },
      { internalType: "uint256", name: "_amountETHMin", type: "uint256" },
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
      { internalType: "bool", name: "_approveMax", type: "bool" },
      { internalType: "uint8", name: "_v", type: "uint8" },
      { internalType: "bytes32", name: "_r", type: "bytes32" },
      { internalType: "bytes32", name: "_s", type: "bytes32" },
    ],
    name: "removeLiquidityETHWithPermit",
    outputs: [
      { internalType: "uint256", name: "amountToken_", type: "uint256" },
      { internalType: "uint256", name: "amountETH_", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_tokenA", type: "address" },
      { internalType: "address", name: "_tokenB", type: "address" },
      { internalType: "uint256", name: "_liquidity", type: "uint256" },
      { internalType: "uint256", name: "_amountAMin", type: "uint256" },
      { internalType: "uint256", name: "_amountBMin", type: "uint256" },
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
      { internalType: "bool", name: "_approveMax", type: "bool" },
      { internalType: "uint8", name: "_v", type: "uint8" },
      { internalType: "bytes32", name: "_r", type: "bytes32" },
      { internalType: "bytes32", name: "_s", type: "bytes32" },
    ],
    name: "removeLiquidityWithPermit",
    outputs: [
      { internalType: "uint256", name: "amountA_", type: "uint256" },
      { internalType: "uint256", name: "amountB_", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "token0", type: "address" },
          { internalType: "address", name: "token1", type: "address" },
          { internalType: "uint256", name: "amount0", type: "uint256" },
          { internalType: "uint256", name: "amount1", type: "uint256" },
          { internalType: "address", name: "payer", type: "address" },
        ],
        internalType: "struct ISmardexMintCallback.MintCallbackData",
        name: "_data",
        type: "tuple",
      },
    ],
    name: "smardexMintCallback",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "int256", name: "_amount0Delta", type: "int256" },
      { internalType: "int256", name: "_amount1Delta", type: "int256" },
      { internalType: "bytes", name: "_data", type: "bytes" },
    ],
    name: "smardexSwapCallback",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_amountOut", type: "uint256" },
      { internalType: "address[]", name: "_path", type: "address[]" },
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "swapETHForExactTokens",
    outputs: [{ internalType: "uint256", name: "amountIn_", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_amountOutMin", type: "uint256" },
      { internalType: "address[]", name: "_path", type: "address[]" },
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "swapExactETHForTokens",
    outputs: [{ internalType: "uint256", name: "amountOut_", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_amountIn", type: "uint256" },
      { internalType: "uint256", name: "_amountOutMin", type: "uint256" },
      { internalType: "address[]", name: "_path", type: "address[]" },
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "swapExactTokensForETH",
    outputs: [{ internalType: "uint256", name: "amountOut_", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_amountIn", type: "uint256" },
      { internalType: "uint256", name: "_amountOutMin", type: "uint256" },
      { internalType: "address[]", name: "_path", type: "address[]" },
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "swapExactTokensForTokens",
    outputs: [{ internalType: "uint256", name: "amountOut_", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_amountOut", type: "uint256" },
      { internalType: "uint256", name: "_amountInMax", type: "uint256" },
      { internalType: "address[]", name: "_path", type: "address[]" },
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "swapTokensForExactETH",
    outputs: [{ internalType: "uint256", name: "amountIn_", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_amountOut", type: "uint256" },
      { internalType: "uint256", name: "_amountInMax", type: "uint256" },
      { internalType: "address[]", name: "_path", type: "address[]" },
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_deadline", type: "uint256" },
    ],
    name: "swapTokensForExactTokens",
    outputs: [{ internalType: "uint256", name: "amountIn_", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  { stateMutability: "payable", type: "receive" },
];
const SMARDEX_PAIR_ABI = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  { inputs: [], name: "InvalidShortString", type: "error" },
  {
    inputs: [{ internalType: "string", name: "str", type: "string" }],
    name: "StringTooLong",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1",
        type: "uint256",
      },
    ],
    name: "Burn",
    type: "event",
  },
  { anonymous: false, inputs: [], name: "EIP712DomainChanged", type: "event" },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "feesLP",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "feesPool",
        type: "uint256",
      },
    ],
    name: "FeesChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount0",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount1",
        type: "uint256",
      },
    ],
    name: "Mint",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      {
        indexed: false,
        internalType: "int256",
        name: "amount0",
        type: "int256",
      },
      {
        indexed: false,
        internalType: "int256",
        name: "amount1",
        type: "int256",
      },
    ],
    name: "Swap",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "reserve0",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "reserve1",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "fictiveReserve0",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "fictiveReserve1",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "priceAverage0",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "priceAverage1",
        type: "uint256",
      },
    ],
    name: "Sync",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    inputs: [],
    name: "DOMAIN_SEPARATOR",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_to", type: "address" }],
    name: "burn",
    outputs: [
      { internalType: "uint256", name: "amount0_", type: "uint256" },
      { internalType: "uint256", name: "amount1_", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "subtractedValue", type: "uint256" },
    ],
    name: "decreaseAllowance",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "eip712Domain",
    outputs: [
      { internalType: "bytes1", name: "fields", type: "bytes1" },
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string", name: "version", type: "string" },
      { internalType: "uint256", name: "chainId", type: "uint256" },
      { internalType: "address", name: "verifyingContract", type: "address" },
      { internalType: "bytes32", name: "salt", type: "bytes32" },
      { internalType: "uint256[]", name: "extensions", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "factory",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getFeeToAmounts",
    outputs: [
      { internalType: "uint256", name: "fees0_", type: "uint256" },
      { internalType: "uint256", name: "fees1_", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getFictiveReserves",
    outputs: [
      { internalType: "uint256", name: "fictiveReserve0_", type: "uint256" },
      { internalType: "uint256", name: "fictiveReserve1_", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getPairFees",
    outputs: [
      { internalType: "uint128", name: "feesLP_", type: "uint128" },
      { internalType: "uint128", name: "feesPool_", type: "uint128" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getPriceAverage",
    outputs: [
      { internalType: "uint256", name: "priceAverage0_", type: "uint256" },
      { internalType: "uint256", name: "priceAverage1_", type: "uint256" },
      {
        internalType: "uint256",
        name: "priceAverageLastTimestamp_",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getReserves",
    outputs: [
      { internalType: "uint256", name: "reserve0_", type: "uint256" },
      { internalType: "uint256", name: "reserve1_", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_fictiveReserveIn", type: "uint256" },
      { internalType: "uint256", name: "_fictiveReserveOut", type: "uint256" },
      {
        internalType: "uint256",
        name: "_priceAverageLastTimestamp",
        type: "uint256",
      },
      { internalType: "uint256", name: "_priceAverageIn", type: "uint256" },
      { internalType: "uint256", name: "_priceAverageOut", type: "uint256" },
      { internalType: "uint256", name: "_currentTimestamp", type: "uint256" },
    ],
    name: "getUpdatedPriceAverage",
    outputs: [
      { internalType: "uint256", name: "priceAverageIn_", type: "uint256" },
      { internalType: "uint256", name: "priceAverageOut_", type: "uint256" },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "addedValue", type: "uint256" },
    ],
    name: "increaseAllowance",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_token0", type: "address" },
      { internalType: "address", name: "_token1", type: "address" },
      { internalType: "uint128", name: "_feesLP", type: "uint128" },
      { internalType: "uint128", name: "_feesPool", type: "uint128" },
    ],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_amount0", type: "uint256" },
      { internalType: "uint256", name: "_amount1", type: "uint256" },
      { internalType: "address", name: "_payer", type: "address" },
    ],
    name: "mint",
    outputs: [{ internalType: "uint256", name: "liquidity_", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "nonces",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
    ],
    name: "permit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint128", name: "_feesLP", type: "uint128" },
      { internalType: "uint128", name: "_feesPool", type: "uint128" },
    ],
    name: "setFees",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "bool", name: "_zeroForOne", type: "bool" },
      { internalType: "int256", name: "_amountSpecified", type: "int256" },
      { internalType: "bytes", name: "_data", type: "bytes" },
    ],
    name: "swap",
    outputs: [
      { internalType: "int256", name: "amount0_", type: "int256" },
      { internalType: "int256", name: "amount1_", type: "int256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "token0",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "token1",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
];

// Constants
const FEES_BASE = BigNumber.from("1000000");

function getAmountOut({
  amount,
  reserveIn,
  reserveOut,
  fictiveReserveIn,
  fictiveReserveOut,
  priceAverageIn,
  priceAverageOut,
  feesLP,
  feesPool,
}) {
  const feesTotal = FEES_BASE + feesPool + feesLP;
  const amountInWithFees = (amount * feesTotal) / FEES_BASE;

  let firstAmountIn = computeFirstTradeQtyIn({
    amount: amountInWithFees,
    reserveIn,
    reserveOut,
    fictiveReserveIn,
    fictiveReserveOut,
    priceAverageIn,
    priceAverageOut,
    feesLP,
    feesPool,
  });

  if (
    firstAmountIn == amountInWithFees &&
    ratioApproxEq(
      fictiveReserveIn,
      fictiveReserveOut,
      priceAverageIn,
      priceAverageOut
    )
  ) {
    ({
      newFictiveReserveIn: fictiveReserveIn,
      newFictiveReserveOut: fictiveReserveOut,
    } = computeFictiveReserves(
      reserveIn,
      reserveOut,
      fictiveReserveIn,
      fictiveReserveOut
    ));
  }

  let amountOut,
    newReserveIn,
    newReserveOut,
    newFictiveReserveIn,
    newFictiveReserveOut;

  ({
    amountOut,
    newReserveIn,
    newReserveOut,
    newFictiveReserveIn,
    newFictiveReserveOut,
  } = applyKConstRuleOut({
    amount: (firstAmountIn * FEES_BASE) / feesTotal,
    reserveIn,
    reserveOut,
    fictiveReserveIn,
    fictiveReserveOut,
    priceAverageIn,
    priceAverageOut,
    feesLP,
    feesPool,
  }));

  amount = amount + (firstAmountIn * FEES_BASE) / feesTotal;

  if (firstAmountIn < amountInWithFees) {
    ({ newFictiveReserveIn, newFictiveReserveOut } = computeFictiveReserves(
      newReserveIn,
      newReserveOut,
      newFictiveReserveIn,
      newFictiveReserveOut
    ));

    let secondAmountOut;
    ({
      amountOut: secondAmountOut,
      newReserveIn,
      newReserveOut,
      newFictiveReserveIn,
      newFictiveReserveOut,
    } = applyKConstRuleOut({
      amount,
      reserveIn: newReserveIn,
      reserveOut: newReserveOut,
      fictiveReserveIn: newFictiveReserveIn,
      fictiveReserveOut: newFictiveReserveOut,
      priceAverageIn,
      priceAverageOut,
      feesLP,
      feesPool,
    }));

    amountOut = amountOut + secondAmountOut;
  }

  return {
    amountOut,
    newReserveIn,
    newReserveOut,
    newFictiveReserveIn,
    newFictiveReserveOut,
  };
}

async function main() {
  // Connect to the Ethereum provider
  const provider = new ethers.providers.JsonRpcProvider(BSC_URL);

  // Create a SmarDex Pair contract instance
  const smardexPairContract = new ethers.Contract(
    SMARDEX_PAIR_ADDRESS,
    SMARDEX_PAIR_ABI,
    provider
  );

  // Fetch parameters required for getAmountOut
  let [reserve0, reserve1] = await smardexPairContract.getReserves();
  let [fictiveReserve0, fictiveReserve1] =
    await smardexPairContract.getFictiveReserves();
  let [priceAverage0, priceAverage1] =
    await smardexPairContract.getPriceAverage();
  let [feesLP, feesPool] = await smardexPairContract.getPairFees();

  console.log("Fetched SmarDex Pair Parameters:");
  console.log(`Reserve In: ${reserve0}`);
  console.log(`Reserve Out: ${reserve1}`);
  console.log(`Fictive Reserve In: ${fictiveReserve0}`);
  console.log(`Fictive Reserve Out: ${fictiveReserve1}`);
  console.log(`Price Average In: ${priceAverage0}`);
  console.log(`Price Average Out: ${priceAverage1}`);
  console.log(`Fees LP: ${feesLP}`);
  console.log(`Fees Pool: ${feesPool}`);

  // Example: Compute getAmountOut
  const amountIn = BigNumber.from("100"); // 1 token with 18 decimals

  const smardexRouterContract = new ethers.Contract(
    SMARDEX_ROUTER_ADDRESS,
    SMARDEX_ROUTER_ABI,
    provider
  );

  // Query getAmountOut
  const [amountOut] = await smardexRouterContract.getAmountOut({
    amount: amountIn,
    reserveIn: reserve0,
    reserveOut: reserve1,
    fictiveReserveIn: fictiveReserve0,
    fictiveReserveOut: fictiveReserve1,
    priceAverageIn: priceAverage0,
    priceAverageOut: priceAverage1,
    feesLP,
    feesPool,
  });

  // From local function
  let result = getAmountOut({
    amount: amountIn,
    reserveIn: reserve0,
    reserveOut: reserve1,
    fictiveReserveIn: fictiveReserve0,
    fictiveReserveOut: fictiveReserve1,
    priceAverageIn: priceAverage0,
    priceAverageOut: priceAverage1,
    feesLP,
    feesPool,
  });

  // Les deux valeurs
  const amountOutFromLocalFunction = BigNumber.from(
    result.amountOut.toString()
  );
  const amountOutFromRouter = BigNumber.from(amountOut.toString());

  // Calcul de la différence relative en pourcentage
  const differenceRelativePercentage =
    (Math.abs(amountOutFromLocalFunction - amountOutFromRouter) /
      amountOutFromRouter) *
    100;

  console.log(
    `Amount Out From Local Function: ${amountOutFromLocalFunction.toString()}`
  );
  console.log(`Amount Out From Router: ${amountOutFromRouter.toString()}`);
  console.log(
    `Différence Relative: ${differenceRelativePercentage.toFixed(6)}%`
  );
}

main().catch((error) => {
  console.error("Error: ", error);
});
