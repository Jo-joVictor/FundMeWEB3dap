import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useAccount } from "wagmi";
import ContributionCard from "../components/ContributionCard";
import StatCard from "../components/StatCard";
import ActivityTable from "../components/ActivityTable";
import { useActivity } from "../hooks/useActivity";
import { usePoolStats, useMyContribution } from "../hooks/useFundMeReads";
import { FUNDME_ADDRESS, addressUrl } from "../contract/constants";
import { ethToUsd, formatEth, formatUsd } from "../lib/format";

const steps = [
  {
    n: "01",
    title: "Connect your wallet",
    body: "Use an Ethereum wallet. You stay in control of every transaction.",
  },
  {
    n: "02",
    title: "Choose your contribution",
    body: "Send ETH worth at least $50 at the Chainlink quote. Contribute again anytime.",
  },
  {
    n: "03",
    title: "Follow the shared pool",
    body: "Track contributions and owner withdrawals in the permanent activity history.",
  },
];

export default function Dashboard() {
  const { isConnected } = useAccount();
  const { balance, funderCount, price, priceFailed } = usePoolStats();
  const { data: mine } = useMyContribution();
  const { data: events = [], isLoading: activityLoading } = useActivity();

  const usd = (wei?: bigint) =>
    wei !== undefined && price ? formatUsd(ethToUsd(wei, price)) : "—";

  return (
    <div>
      <section className="grid items-start gap-10 lg:grid-cols-[1fr_440px]">
        <div className="pt-6 lg:pt-14">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Ethereum · Shared funding
          </span>
          <h1 className="mt-6 text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl">
            Fund ideas. Power possibilities.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted">
            Support a shared pool of possibilities with ETH. Transparent
            contributions, clear rules, and a record you can follow on-chain.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <a
              href="#contribute"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
            >
              <ArrowUpRight size={16} /> Fund Now
            </a>
            <a
              href={addressUrl(FUNDME_ADDRESS)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
            >
              Explore the contract <ArrowUpRight size={14} />
            </a>
          </div>
          <p className="mt-6 text-sm text-muted">
            ETH only · $50 minimum · Repeat contributions
          </p>
        </div>

        <ContributionCard />
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Contract Balance"
          value={`${formatEth(balance)} ETH`}
          sub={`${usd(balance)} in the shared pool`}
        />
        <StatCard
          label="Active Contributors"
          value={funderCount?.toString() ?? "—"}
          sub="Unique wallets · current cycle"
        />
        <StatCard
          label="Your Contribution"
          value={isConnected ? `${formatEth(mine)} ETH` : "—"}
          sub={isConnected ? `${usd(mine)} this cycle` : "Connect a wallet to see yours"}
        />
        <StatCard
          label="ETH/USD Price"
          value={price ? formatUsd(price) : priceFailed ? "Unavailable" : "—"}
          sub="Chainlink · Sepolia feed"
        />
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-6">
        <h2 className="text-lg font-semibold">Recent activity</h2>
        <p className="mt-1 text-sm text-muted">
          A shared ledger of contributions. History stays visible after a withdrawal.
        </p>
        <div className="mt-5">
          {activityLoading ? (
            <div className="h-32 animate-pulse rounded-lg bg-surface-2" />
          ) : events.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              No activity yet. Be the first to contribute.
            </p>
          ) : (
            <ActivityTable events={events.slice(0, 3)} price={price} />
          )}
        </div>
        <Link
          to="/activity"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
        >
          View all activity <ArrowRight size={14} />
        </Link>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold">How It Works</h2>
        <div className="mt-6 grid gap-8 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n}>
              <p className="flex items-baseline gap-2">
                <span className="text-sm text-accent">{s.n}</span>
                <span className="font-semibold">{s.title}</span>
              </p>
              <p className="mt-2 text-sm text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}