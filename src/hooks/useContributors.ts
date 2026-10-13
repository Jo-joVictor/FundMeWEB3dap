import { useReadContracts } from "wagmi";
import type { Address } from "viem";
import { fundMeAbi } from "../contract/abi";
import { FUNDME_ADDRESS } from "../contract/constants";

const base = { address: FUNDME_ADDRESS, abi: fundMeAbi } as const;

export function useContributors(page: number, pageSize: number, total?: bigint) {
  const start = page * pageSize;
  const count =
    total === undefined ? 0 : Math.max(0, Math.min(pageSize, Number(total) - start));

  const funders = useReadContracts({
    contracts: Array.from({ length: count }, (_, i) => ({
      ...base,
      functionName: "getFunder" as const,
      args: [BigInt(start + i)] as const,
    })),
    query: { enabled: count > 0 },
  });

  const addrs = funders.data
    ?.map((r) => r.result)
    .filter(Boolean) as Address[] | undefined;

  const amounts = useReadContracts({
    contracts: (addrs ?? []).map((a) => ({
      ...base,
      functionName: "getAddressToAmountFunded" as const,
      args: [a] as const,
    })),
    query: { enabled: !!addrs && addrs.length > 0 },
  });

  const rows = (addrs ?? []).map((wallet, i) => ({
    wallet,
    amount: amounts.data?.[i]?.result as bigint | undefined,
  }));

  return { rows, isLoading: funders.isLoading || amounts.isLoading };
}