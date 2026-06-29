const USD_TO_INR_RATE = 83;

export function usdToInr(amountInUsd: number) {
  return amountInUsd * USD_TO_INR_RATE;
}

export function inrToUsd(amountInInr: number) {
  return amountInInr / USD_TO_INR_RATE;
}

export function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatUsdAsInr(amountInUsd: number) {
  return formatInr(usdToInr(amountInUsd));
}
