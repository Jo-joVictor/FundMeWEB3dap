import { ArrowUpRight } from "lucide-react";
import { useAccount } from "wagmi";
import type { ActivityEvent } from "../hooks/useActivity";
import { txUrl } from "../contract/constants";
import { ethToUsd, formatEth, formatUsd, formatUtc, shortAddress } from "../lib/format";

export default function ActivityTable({
  events,
  price,
}: {
  events: ActivityEvent[];
  price?: bigint;
}) {
  const { address } = useAccount();

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="bg-surface-2 text-xs text-muted">
            <th className="rounded-l-lg px-3 py-2.5 font-normal">Event / wallet</th>
            <th className="px-3 py-2.5 font-normal">Amount</th>
            <th className="px-3 py-2.5 font-normal">Timestamp</th>
            <th className="rounded-r-lg px-3 py-2.5 font-normal">Transaction</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => {
            const isYou =
              !!address && e.wallet.toLowerCase() === address.toLowerCase();
            const isWithdrawal = e.type === "withdrawal";
            return (
              <tr key={`${e.hash}-${e.logIndex}`} className="border-b border-line last:border-0">
                <td className="px-3 py-4">
                  <p className="font-semibold">
                    {isWithdrawal ? "Pool withdrawal" : "Contribution"}
                    {isYou && !isWithdrawal && " · You"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {shortAddress(e.wallet)}
                    {isWithdrawal && " · Owner"}
                  </p>
                </td>
                <td className="px-3 py-4">
                  <p className="font-semibold">{formatEth(e.amount)} ETH</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {price ? formatUsd(ethToUsd(e.amount, price)) : "—"}
                  </p>
                </td>
                <td className="px-3 py-4 text-xs text-muted">
                  {e.timestamp ? formatUtc(e.timestamp) : "—"}
                </td>
                <td className="px-3 py-4">
                  <a
                    href={txUrl(e.hash)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                  >
                    {shortAddress(e.hash)} <ArrowUpRight size={12} />
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}