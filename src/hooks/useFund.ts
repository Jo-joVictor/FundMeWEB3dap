import { parseEther } from "viem";
import { fundMeAbi } from "../contract/abi";
import { FUNDME_ADDRESS } from "../contract/constants";
import { useTx } from "./useTx";

export function useFund() {
  const { writeContract, ...tx } = useTx();

  const fund = (value: bigint) =>
    writeContract({
      address: FUNDME_ADDRESS,
      abi: fundMeAbi,
      functionName: "fund",
      value,
    });

  return { fund, ...tx };
}

export { parseEther };