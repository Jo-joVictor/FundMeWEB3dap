import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { BaseError, UserRejectedRequestError } from "viem";
import { useToast } from "../context/Toast";
import { txUrl } from "../contract/constants";
import { shortAddress } from "../lib/format";

export type TxStatus =
  | "idle"
  | "awaiting"
  | "pending"
  | "confirmed"
  | "declined"
  | "reverted"
  | "failed";

export function useTx(label: "Contribution" | "Withdrawal" = "Contribution") {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { writeContract, data: hash, error, isPending, reset } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  const declined =
    error instanceof BaseError &&
    !!error.walk((e) => e instanceof UserRejectedRequestError);

  let status: TxStatus = "idle";
  if (isPending) status = "awaiting";
  else if (error) status = declined ? "declined" : "failed";
  else if (hash && receipt.isLoading) status = "pending";
  else if (receipt.data?.status === "success") status = "confirmed";
  else if (receipt.data?.status === "reverted") status = "reverted";

  useEffect(() => {
    if (status === "confirmed") queryClient.invalidateQueries();

    if (status === "pending" && hash) {
      toast.push({
        id: hash,
        kind: "pending",
        title: `${label} pending`,
        body: `Submitted · ${shortAddress(hash)}`,
        href: txUrl(hash),
      });
    } else if (status === "confirmed" && hash) {
      toast.push({
        id: hash,
        kind: "success",
        title: `${label} confirmed`,
        body: shortAddress(hash),
        href: txUrl(hash),
      });
    } else if (status === "reverted" && hash) {
      toast.push({
        id: hash,
        kind: "error",
        title: `${label} failed`,
        body: "The receipt reverted. Network gas may have been spent.",
        href: txUrl(hash),
      });
    } else if (status === "declined") {
      toast.push({
        id: "declined",
        kind: "error",
        title: "Wallet request declined",
        body: "No funds sent.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, hash]);

  return {
    writeContract,
    hash,
    status,
    error: error ? error.message.split("\n")[0] : undefined,
    reset,
  };
}