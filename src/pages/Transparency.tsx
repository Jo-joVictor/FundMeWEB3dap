import { useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useAccount } from "wagmi";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import HistoryChart from "../components/HistoryChart";
import { useActivity } from "../hooks/useActivity";
import { usePoolStats } from "../hooks/useFundMeReads";
import { useContributors } from "../hooks/useContributors";
import { useOracle } from "../hooks/useOracle";
import { FUNDME_ADDRESS, addressUrl } from "../contract/constants";
import { ethToUsd, formatEth, formatUsd, formatUtc, minEthWei, shortAddress } from "../lib/format";

const PAGE_SIZE = 6;

function AddrLink({ addr, you }: { addr: string; you?: boolean }) {
  return (
    <a href={addressUrl(addr)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
      {shortAddress(addr)}
      {you && " · You"} <ArrowUpRight size={12} />
    </a>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-1 text-sm font-medium">{children}</div>
    </div>
  );
}

export default function Transparency() {
  const { address } = useAccount();
  const { balance, funderCount, price, minUsd, owner } = usePoolStats();
  const { data: events = [] } = useActivity();
  const oracle = useOracle();
  const [page, setPage] = useState(0);
  const { rows, isLoading } = useContributors(page, PAGE_SIZE, funderCount);

  const total = events.reduce((s, e) => (e.type === "contribution" ? s + e.amount : s), 0n);
  const minWei = price && minUsd ? minEthWei(minUsd, price) : undefined;
  const usd = (wei?: bigint) => (wei !== undefined && price ? formatUsd(ethToUsd(wei, price)) : "—");

  // Contributions made since the latest withdrawal (events are newest-first)
  const cycleCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of events) {
      if (e.type === "withdrawal") break;
      const k = e.wallet.toLowerCase();
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [events]);

  const lastWithdrawal = events.find((e) => e.type === "withdrawal");
  const count = Number(funderCount ?? 0n);
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const card = "rounded-2xl border border-line bg-surface p-6";

  return (
    <div>
      <PageHeader
        eyebrow="OPEN BY DESIGN"
        title="Transparency"
        subtitle="Understand the pool, the pricing oracle, and the rules behind every contribution."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Contract balance" value={`${formatEth(balance)} ETH`} sub={usd(balance)} />
        <StatCard label="Contributor count" value={funderCount?.toString() ?? "—"} sub="Unique wallets in the current cycle" />
        <StatCard
          label="Minimum funding amount"
          value={minUsd ? formatUsd(minUsd) + " USD" : "—"}
          sub={minWei ? `${formatEth(minWei, 4)} ETH at the current quote` : undefined}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className={card}>
          <h2 className="text-lg font-semibold">Contract details</h2>
          <p className="mt-1 text-sm text-muted">Sepolia testnet deployment</p>
          <div className="mt-6 space-y-5">
            <Field label="Contract address"><AddrLink addr={FUNDME_ADDRESS} /></Field>
            <Field label="Owner address">{owner ? <AddrLink addr={owner} /> : "—"}</Field>
            <Field label="Funding asset">ETH only · repeat contributions allowed</Field>
            <Field label="Withdrawal permissions">Owner only · entire shared pool</Field>
          </div>
          <p className="mt-6 text-xs text-muted">
            This app does not represent an audit or verification. Review the contract before contributing. No refunds.
          </p>
        </section>

        <section className={card}>
          <h2 className="text-lg font-semibold">Historical activity</h2>
          <p className="mt-1 text-sm text-muted">Cumulative contributions · totals do not reset</p>
          <p className="mt-4 text-3xl font-semibold">{formatEth(total)} ETH</p>
          <p className="mt-1 text-xs text-muted">Cumulative historical contributions · {usd(total)} at the current quote</p>
          <div className="mt-4">
            <HistoryChart events={events} />
          </div>
        </section>
      </div>

      <section className={`${card} mt-6`}>
        <h2 className="text-lg font-semibold">Chainlink oracle</h2>
        <p className="mt-1 text-sm text-muted">ETH / USD conversion used to enforce the $50 minimum</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="ETH/USD Price">{price ? formatUsd(price) : "—"}</Field>
          <Field label="Feed">
            {oracle.description ?? "—"}
            {oracle.decimals !== undefined && ` · ${oracle.decimals} decimals`}
          </Field>
          <Field label="Latest update">{oracle.updatedAt ? formatUtc(oracle.updatedAt) : "—"}</Field>
          <Field label="Round ID"><span className="break-all">{oracle.roundId?.toString() ?? "—"}</span></Field>
        </div>
        <p className="mt-6 text-xs text-muted">
          Live Sepolia feed. The actual ETH minimum moves with the oracle price; the contract checks the conversion when the transaction executes. Gas is separate.
        </p>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-lg font-semibold">Current contributors</h2>
        <p className="mt-1 text-sm text-muted">
          {count} unique wallets
          {lastWithdrawal && ` · current cycle began after the ${formatUtc(lastWithdrawal.timestamp).split(" · ")[0]} withdrawal`}
        </p>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="bg-surface-2 text-xs text-muted">
                <th className="rounded-l-lg px-3 py-2.5 font-normal">Wallet</th>
                <th className="px-3 py-2.5 font-normal">Current ETH</th>
                <th className="px-3 py-2.5 font-normal">USD equivalent</th>
                <th className="rounded-r-lg px-3 py-2.5 font-normal">Contributions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="px-3 py-8 text-center text-muted">Loading contributors…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-8 text-center text-muted">No contributors in the current cycle.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.wallet} className="border-b border-line last:border-0">
                    <td className="px-3 py-3.5">
                      <AddrLink addr={r.wallet} you={!!address && r.wallet.toLowerCase() === address.toLowerCase()} />
                    </td>
                    <td className="px-3 py-3.5">{formatEth(r.amount)} ETH</td>
                    <td className="px-3 py-3.5">{usd(r.amount)}</td>
                    <td className="px-3 py-3.5">{cycleCounts.get(r.wallet.toLowerCase()) ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-muted">
            Showing {rows.length} of {count} current contributors
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
              className="rounded-lg border border-line px-4 py-2.5 text-sm font-semibold hover:bg-surface-2 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= pages - 1}
              className="flex items-center gap-1.5 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold hover:bg-surface-2 disabled:opacity-40"
            >
              Next contributors <ArrowRight size={14} />
            </button>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted">
          Current records reset when the owner withdraws. The historical activity ledger still represents all past contributions and withdrawals.
        </p>
      </section>
    </div>
  );
}