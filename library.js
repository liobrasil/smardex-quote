const { ethers } = require("ethers");

// Constants
const FEES_BASE = ethers.BigNumber.from("1000000");
const APPROX_PRECISION = ethers.BigNumber.from("1");
const APPROX_PRECISION_BASE = ethers.BigNumber.from("1000000");

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
