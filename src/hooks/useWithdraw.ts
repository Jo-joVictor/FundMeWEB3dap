import { fundMeAbi } from "../contract/abi";
import { FUNDME_ADDRESS } from "../contract/constants";
import { useTx } from "./useTx";

export function useWithdraw() {
  const { writeContract, ...tx } = useTx("Withdrawal");

  const withdraw = () =>
    writeContract({
      address: FUNDME_ADDRESS,
      abi: fundMeAbi,
      functionName: "cheaperWithdraw",
    });

  return { withdraw, ...tx };
}