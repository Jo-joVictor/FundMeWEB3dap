import { useReadContract, useReadContracts } from "wagmi";
import { zeroAddress } from "viem";
import { aggregatorAbi, fundMeAbi } from "../contract/abi";
import { FUNDME_ADDRESS } from "../contract/constants";

export function useOracle() {
  const { data: feed } = useReadContract({
    address: FUNDME_ADDRESS,
    abi: fundMeAbi,
    functionName: "getPriceFeed",
  });

  const addr = feed ?? zeroAddress;
  const { data } = useReadContracts({
    contracts: [
      { address: addr, abi: aggregatorAbi, functionName: "latestRoundData" },
      { address: addr, abi: aggregatorAbi, functionName: "decimals" },
      { address: addr, abi: aggregatorAbi, functionName: "description" },
    ],
    query: { enabled: !!feed, refetchInterval: 30_000 },
  });

  const round = data?.[0].result;
  return {
    feed,
    roundId: round?.[0],
    updatedAt: round ? Number(round[3]) : undefined,
    decimals: data?.[1].result,
    description: data?.[2].result,
  };
}