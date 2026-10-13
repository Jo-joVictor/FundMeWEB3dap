import { useAccount, useReadContract } from "wagmi";
import { isAddressEqual } from "viem";
import { fundMeAbi } from "../contract/abi";
import { FUNDME_ADDRESS } from "../contract/constants";

export function useIsOwner() {
  const { address } = useAccount();
  const { data: owner } = useReadContract({
    address: FUNDME_ADDRESS,
    abi: fundMeAbi,
    functionName: "getOwner",
  });

  return !!address && !!owner && isAddressEqual(address, owner);
}