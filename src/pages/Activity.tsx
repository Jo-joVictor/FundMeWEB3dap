import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Calendar, History, Search } from "lucide-react";
import { useAccount } from "wagmi";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import ActivityTable from "../components/ActivityTable";
import { useActivity } from "../hooks/useActivity";
import { usePoolStats } from "../hooks/useFundMeReads";
import { useWalletModal } from "../context/WalletModal";
import { ethToUsd, formatEth, formatUsd } from "../lib/format";

const PAGE_SIZE = 6;
const selectClass =
  "rounded-lg border border-line bg-surface px-3 py-2.5 text-sm font-medium outline-none focus:border-accent";

export default function Activity() {
  const { address, isConnected } = useAccount();
  const { openModal } = useWalletModal();
  const { balance, price } = usePoolStats();
  const { data: events = [], isLoading, error } = useActivity();

  const [tab, setTab] = useState<"all" | "mine">("all");
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"all" | "contribution" | "withdrawal">("all");
  const [range, setRange] = useState<"7" | "30" | "all">("30");
  const [page, setPage] = useState(0);

  const totals = useMemo(() => {
    let contributed = 0n;
    let withdrawn = 0n;
    for (const e of events) {
      if (e.type === "contribution") contributed += e.amount;
      else withdrawn += e.amount;
    }
    return { contributed, withdrawn };
  }, [events]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cutoff =
      range === "all" ? 0 : Date.now() / 1000 - Number(range) * 86400;
    return events.filter((e) => {
      if (tab === "mine") {
        if (!address || e.type !== "contribution") return false;
        if (e.wallet.toLowerCase() !== address.toLowerCase()) return false;
      }
      if (type !== "all" && e.type !== type) return false;
      if (e.timestamp < cutoff) return false;
      if (q && !e.wallet.toLowerCase().includes(q) && !e.hash.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [events, tab, address, type, range, query]);

  useEffect(() => setPage(0), [tab, query, type, range]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const usd = (wei?: bigint) =>
    wei !== undefined && price ? formatUsd(ethToUsd(wei, price)) : "—";

  const tabClass = (active: boolean) =>
    `border-b-2 pb-3 text-sm font-medium transition-colors ${
      active ? "border-accent text-accent" : "border-transparent text-muted hover:text-fg"
    }`;

  return (
    <div>
      <PageHeader
        eyebrow="THE SHARED LEDGER"
        title="Activity"
        subtitle="Every contribution. Every pool withdrawal. One permanent history."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Historical contributions"
          value={`${formatEth(totals.contributed)} ETH`}
          sub={`${usd(totals.contributed)} at the current quote`}
        />
        <StatCard
          label="Current contract balance"
          value={`${formatEth(balance)} ETH`}
          sub={`${usd(balance)} available in the pool`}
        />
        <StatCard
          label="Historical withdrawals"
          value={`${formatEth(totals.withdrawn)} ETH`}
          sub="Contract-wide · owner only"
        />
      </div>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-6">
            <button className={tabClass(tab === "all")} onClick={() => setTab("all")}>
              All Activity
            </button>
            <button className={tabClass(tab === "mine")} onClick={() => setTab("mine")}>
              My Activity
            </button>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Sepolia history
          </span>
        </div>

        {tab === "mine" && !isConnected ? (
          <div className="py-14 text-center">
            <p className="text-muted">Connect a wallet to see your contributions.</p>
            <button
              onClick={openModal}
              className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap gap-3">
              <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-line bg-surface-2 px-3">
                <Search size={16} className="text-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search wallet or transaction hash"
                  className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-muted"
                />
              </div>
              <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className={selectClass}>
                <option value="all">All events</option>
                <option value="contribution">Contributions</option>
                <option value="withdrawal">Withdrawals</option>
              </select>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-muted" />
                <select value={range} onChange={(e) => setRange(e.target.value as typeof range)} className={selectClass}>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="all">All time</option>
                </select>
              </div>
            </div>

            <div className="mt-5">
              {isLoading ? (
                <div className="space-y-3 py-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-2" />
                  ))}
                  <p className="text-center text-xs text-muted">
                    Reading the contract history…
                  </p>
                </div>
              ) : error ? (
                <p className="rounded-lg bg-danger-soft px-3 py-3 text-sm text-danger">
                  Couldn't load history: {error.message.split("\n")[0]}
                </p>
              ) : visible.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="font-semibold">
                    {tab === "mine" && events.length > 0 && !query && type === "all" && range === "all"
                      ? "No contributions yet"
                      : "No matching activity"}
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                    No events match this wallet and filter combination. Try a
                    different address or expand the date range. The historical
                    ledger has {events.length} events; an empty filtered result
                    does not mean the contract has no activity.
                  </p>
                  <button
                    onClick={() => {
                      setQuery("");
                      setType("all");
                      setRange("all");
                    }}
                    className="mt-4 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold hover:bg-surface-2"
                  >
                    Clear search &amp; filters
                  </button>
                </div>
              ) : (
                <ActivityTable events={visible} price={price} />
              )}
            </div>

            <p className="mt-3 text-xs text-muted">
              USD values use the current Chainlink quote. Withdrawal events apply
              to the entire pool, not an individual contribution.
            </p>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted">
                Showing {visible.length} of {filtered.length} historical events
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
                  Next <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <div className="mt-6 flex gap-3 rounded-2xl bg-accent-soft p-5">
        <History size={18} className="mt-0.5 shrink-0 text-accent" />
        <div>
          <p className="font-semibold">History does not reset</p>
          <p className="mt-1 text-sm text-muted">
            An owner withdrawal resets current-cycle contributor records. Prior
            contributions and contract-wide withdrawals remain represented here
            in historical activity.
          </p>
        </div>
      </div>
    </div>
  );
}