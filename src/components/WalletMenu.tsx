import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useAccount, useBalance, useDisconnect, useReadContract } from "wagmi";
import { fundMeAbi } from "../contract/abi";
import { FUNDME_ADDRESS, addressUrl } from "../contract/constants";
import { ethToUsd, formatEth, formatUsd, shortAddress } from "../lib/format";
import { useIsOwner } from "../hooks/useIsOwner";

export default function WalletMenu() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const isOwner = useIsOwner();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: balance } = useBalance({ address });
  const { data: funded } = useReadContract({
    address: FUNDME_ADDRESS,
    abi: fundMeAbi,
    functionName: "getAddressToAmountFunded",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const { data: price } = useReadContract({
    address: FUNDME_ADDRESS,
    abi: fundMeAbi,
    functionName: "getCurrentPrice",
  });

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-semibold hover:border-accent"
      >
        {shortAddress(address)}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-2xl border border-line bg-surface p-5 shadow-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Sepolia · connected
          </span>

          <p className="mt-3 text-lg font-semibold">{shortAddress(address)}</p>

          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Wallet ETH balance</dt>
              <dd className="font-medium">
                {balance ? formatEth(balance.value, 4) : "—"} ETH
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Current contribution</dt>
              <dd className="font-medium">
                {formatEth(funded)} ETH
                {funded !== undefined && price !== undefined && (
                  <> · {formatUsd(ethToUsd(funded, price))}</>
                )}
              </dd>
            </div>
          </dl>

          <p className="mt-3 text-xs text-muted">
            {isOwner
              ? "Owner account · Dashboard, Activity, Transparency and Owner."
              : "Contributor account · Dashboard, Activity, Transparency. Owner navigation is not shown."}
          </p>

          <a
            href={addressUrl(address!)}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex items-center justify-center gap-1 rounded-lg border border-line py-2.5 text-sm font-semibold hover:bg-surface-2"
          >
            View on Etherscan <ArrowUpRight size={14} />
          </a>
          <button
            onClick={() => {
              disconnect();
              setOpen(false);
            }}
            className="mt-2 w-full rounded-lg border border-line py-2.5 text-sm font-semibold hover:bg-surface-2"
          >
            Disconnect wallet
          </button>
        </div>
      )}
    </div>
  );
}