import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { fundMeAbi } from "../contract/abi";
import { FUNDME_ADDRESS } from "../contract/constants";

const base = { address: FUNDME_ADDRESS, abi: fundMeAbi } as const;

export function usePoolStats() {
  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      { ...base, functionName: "getBalance" },
      { ...base, functionName: "getNumberOfFunders" },
      { ...base, functionName: "getCurrentPrice" },
      { ...base, functionName: "MINIMUM_USD" },
      { ...base, functionName: "getOwner" },
    ],
    query: { refetchInterval: 15_000 },
  });

  return {
    balance: data?.[0].result,
    funderCount: data?.[1].result,
    price: data?.[2].result, // USD per ETH, 18 decimals
    minUsd: data?.[3].result, // 50e18
    owner: data?.[4].result,
    priceFailed: data?.[2].status === "failure",
    isLoading,
    refetch,
  };
}

export function useMyContribution() {
  const { address } = useAccount();
  return useReadContract({
    ...base,
    functionName: "getAddressToAmountFunded",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}