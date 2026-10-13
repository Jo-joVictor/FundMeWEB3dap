import { formatEther } from "viem";

export const shortAddress = (addr?: string) =>
  addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";

export const formatEth = (wei?: bigint, digits = 3) =>
  wei === undefined ? "—" : Number(formatEther(wei)).toFixed(digits);

// price is the contract's 18-decimal USD price per ETH
export const ethToUsd = (wei: bigint, price: bigint) =>
  (wei * price) / 10n ** 18n;

export const formatUsd = (usd18?: bigint) =>
  usd18 === undefined
    ? "—"
    : Number(formatEther(usd18)).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      });
    
import { parseEther } from "viem";

// Smallest ETH amount (wei) whose USD value is >= minUsd. Rounds up so the
// contract's integer math never lands 1 wei under the minimum.
export const minEthWei = (minUsd18: bigint, price18: bigint) =>
  (minUsd18 * 10n ** 18n + price18 - 1n) / price18;

// Whole-dollar amount (e.g. the $50 / $100 chips) converted to wei, rounded up.
export const usdToWei = (usd: number, price18: bigint) =>
  (BigInt(usd) * 10n ** 36n + price18 - 1n) / price18;

// Safe parser for the amount input. Returns undefined for empty or invalid text.
export const parseEthInput = (value: string): bigint | undefined => {
  try {
    if (!value || Number(value) <= 0) return undefined;
    return parseEther(value);
  } catch {
    return undefined;
  }
};

// Wei -> input string, rounded UP to 6 decimals so a chip like "$50"
// never ends up 1 wei under the minimum.
export const weiToInput = (wei: bigint) => {
  const step = 10n ** 12n;
  const up = ((wei + step - 1n) / step) * step;
  return formatEther(up);
};

export const formatUtc = (ts: number) => {
  const d = new Date(ts * 1000);
  const day = d.getUTCDate();
  const mon = d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" });
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${day} ${mon} ${d.getUTCFullYear()} · ${hh}:${mm} UTC`;
};