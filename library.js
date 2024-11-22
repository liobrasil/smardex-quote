const { BigNumber } = require("ethers");

// Constants
const FEES_BASE = BigNumber.from("1000000");
const APPROX_PRECISION = BigNumber.from("1");
const APPROX_PRECISION_BASE = BigNumber.from("1000000");

// Integer square root function
function sqrtInteger(x) {
  const ZERO = BigNumber.from(0);
  const ONE = BigNumber.from(1);

  if (x.eq(ZERO)) {
    return ZERO;
  }

  let xx = x; // Clone x
  let r = ONE; // Initial value for r

  // Perform the shifting based on the ranges in the original function
  if (xx.gte(BigNumber.from("100000000000000000000000000000000"))) {
    // 32
    xx = xx.shr(128);
    r = r.shl(64);
  }
  if (xx.gte(BigNumber.from("10000000000000000"))) {
    // 16
    xx = xx.shr(64);
    r = r.shl(32);
  }
  if (xx.gte(BigNumber.from("100000000"))) {
    // 8
    xx = xx.shr(32);
    r = r.shl(16);
  }
  if (xx.gte(BigNumber.from("10000"))) {
    // 4
    xx = xx.shr(16);
    r = r.shl(8);
  }
  if (xx.gte(BigNumber.from("100"))) {
    // 2
    xx = xx.shr(8);
    r = r.shl(4);
  }
  if (xx.gte(BigNumber.from("10"))) {
    // 1
    xx = xx.shr(4);
    r = r.shl(2);
  }
  if (xx.gte(BigNumber.from("8"))) {
    r = r.shl(1);
  }

  // Perform Newton-Raphson iterations to refine the result
  for (let i = 0; i < 7; i++) {
    r = r.add(x.div(r)).shr(1);
  }

  const r1 = x.div(r);
  return r.lt(r1) ? r : r1;
}

function computeFictiveReserves(
  reserveIn,
  reserveOut,
  fictiveReserveIn,
  fictiveReserveOut
) {
  let newFictiveReserveIn, newFictiveReserveOut;

  if (reserveOut * fictiveReserveIn < reserveIn * fictiveReserveOut) {
    const temp =
      (((reserveOut * reserveOut) / fictiveReserveOut) * fictiveReserveIn) /
      reserveIn;

    newFictiveReserveIn =
      (temp * fictiveReserveIn) / fictiveReserveOut +
      (reserveOut * fictiveReserveIn) / fictiveReserveOut;
    newFictiveReserveOut = reserveOut + temp;
  } else {
    newFictiveReserveIn =
      (fictiveReserveIn * reserveOut) / fictiveReserveOut + reserveIn;
    newFictiveReserveOut =
      (fictiveReserveOut * reserveIn) / fictiveReserveIn + reserveOut;
  }

  // Divide both fictive reserves by 4 as per the original logic
  newFictiveReserveIn = newFictiveReserveIn / 4;
  newFictiveReserveOut = newFictiveReserveOut / 4;

  return {
    newFictiveReserveIn,
    newFictiveReserveOut,
  };
}

function ratioApproxEq(xNum, xDen, yNum, yDen) {
  // Calculate cross products of the ratios
  const left = xNum * yDen;
  const right = xDen * yNum;

  // If they are exactly equal, return true
  if (left == right) {
    return true;
  }

  // Calculate the tolerance range
  const diff = left - Math.abs(right);
  const tolerance =
    (Math.abs(right) * APPROX_PRECISION) / APPROX_PRECISION_BASE;

  // Check if the difference is within the tolerance
  return diff <= tolerance;
}

function computeFirstTradeQtyIn({
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
  // Default to the input amount
  let firstAmountIn = amount;

  // Check if the trade is in the correct direction
  if (fictiveReserveOut * priceAverageIn > fictiveReserveIn * priceAverageOut) {
    const feesTotal = FEES_BASE - feesPool - feesLP;
    const scaledReserveIn =
      fictiveReserveIn * (FEES_BASE * 2 - feesPool * 2 - feesLP);
    const denominator = feesTotal * 2;

    // Calculate the square root term
    const numerator =
      ((fictiveReserveIn * fictiveReserveOut * 4) / priceAverageOut) *
        priceAverageIn *
        (feesTotal * FEES_BASE - feesPool) +
      fictiveReserveIn * fictiveReserveIn * (feesLP * feesLP);

    const sqrtCompare = scaledReserveIn + amount * denominator;
    const sqrtValue = scaledReserveIn + (amount * denominator).sqrt();

    // Update firstAmountIn if sqrt condition is satisfied
    if (numerator < sqrtCompare * sqrtCompare) {
      firstAmountIn = sqrtValue - scaledReserveIn / denominator;
    }
  }

  return firstAmountIn;
}

function applyKConstRuleOut({
  amount,
  reserveIn,
  reserveOut,
  fictiveReserveIn,
  fictiveReserveOut,
  feesLP,
  feesPool,
}) {
  // Compute the amount with fees
  const amountInWithFee = amount * FEES_BASE - feesLP - feesPool;

  // Calculate the amount of output tokens
  const numerator = amountInWithFee * fictiveReserveOut;
  const denominator = fictiveReserveIn * FEES_BASE + amountInWithFee;
  const amountOut = numerator / denominator;

  // Update the reserves
  const amountInWithFeeLp = amountInWithFee + (amount * feesLP) / FEES_BASE;
  const newReserveIn = reserveIn + amountInWithFeeLp;
  const newReserveOut = reserveOut - amountOut;
  const newFictiveReserveIn = fictiveReserveIn + amountInWithFeeLp;
  const newFictiveReserveOut = fictiveReserveOut - amountOut;

  return {
    amountOut,
    newReserveIn,
    newReserveOut,
    newFictiveReserveIn,
    newFictiveReserveOut,
  };
}

module.exports = {
  computeFirstTradeQtyIn,
  ratioApproxEq,
  computeFictiveReserves,
  applyKConstRuleOut,
};
