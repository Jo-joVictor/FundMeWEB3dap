import { useState } from "react";
import { ArrowUpRight, KeyRound, Lock, Shield } from "lucide-react";
import { useAccount } from "wagmi";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import Modal from "../components/Modal";
import { useIsOwner } from "../hooks/useIsOwner";
import { usePoolStats } from "../hooks/useFundMeReads";
import { useActivity } from "../hooks/useActivity";
import { useWithdraw } from "../hooks/useWithdraw";
import { useWalletModal } from "../context/WalletModal";
import { txUrl } from "../contract/constants";
import { ethToUsd, formatEth, formatUsd, formatUtc, shortAddress } from "../lib/format";

const primaryBtn =
  "flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50";
const secondaryBtn =
  "flex w-full items-center justify-center gap-1.5 rounded-lg border border-line py-3 text-sm font-semibold hover:bg-surface-2";

export default function Owner() {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount();
  const isOwner = useIsOwner();
  const { owner, balance, funderCount, price } = usePoolStats();
  const { data: events = [] } = useActivity();
  const { withdraw, status, hash, error, reset } = useWithdraw();
  const { openModal } = useWalletModal();

  const [open, setOpen] = useState(false);
  // Balance and count become 0 after withdrawing, so keep what was withdrawn
  const [snap, setSnap] = useState<{ amount: bigint; count: bigint } | null>(null);

  const usd = (wei?: bigint) =>
    wei !== undefined && price ? formatUsd(ethToUsd(wei, price)) : "—";

  /* ---------- Guard ---------- */
  if (isConnecting || isReconnecting || (isConnected && owner === undefined)) {
    return <div className="h-40 animate-pulse rounded-2xl bg-surface" />;
  }

  if (!isOwner) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-8 text-center">
        <Lock size={28} className="mx-auto text-accent" />
        <h1 className="mt-4 text-2xl font-semibold">Owner access only</h1>
        <p className="mt-2 text-sm text-muted">
          {isConnected
            ? "The connected wallet is not the contract owner."
            : "Connect the contract owner wallet to continue."}
        </p>
        {!isConnected && (
          <button onClick={openModal} className={`${primaryBtn} mt-5`}>
            Connect Wallet
          </button>
        )}
      </div>
    );
  }

  const withdrawals = events.filter((e) => e.type === "withdrawal");
  const previous = withdrawals[0];
  const lifetime = events.reduce((s, e) => (e.type === "contribution" ? s + e.amount : s), 0n);
  const busy = status === "awaiting" || status === "pending";

  const closeModal = () => {
    setOpen(false);
    if (!busy) reset(); // keep tracking a transaction that's still in flight
  };

  const confirm = () => {
    if (balance === undefined) return;
    setSnap({ amount: balance, count: funderCount ?? 0n });
    withdraw();
  };

  return (
    <div>
      <PageHeader
        eyebrow="CONTRACT ADMINISTRATION"
        title="Owner Dashboard"
        subtitle="Manage withdrawals from the shared pool. This workspace is visible only to the contract owner."
      />

      <div className="flex items-center justify-between rounded-xl bg-accent-soft px-4 py-3 text-sm">
        <span className="flex items-center gap-2 font-medium text-accent">
          <KeyRound size={16} /> Owner wallet connected
        </span>
        <span className="text-muted">{shortAddress(address)} · Sepolia</span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Withdrawable ETH" value={`${formatEth(balance)} ETH`} sub={`${usd(balance)} available`} />
        <StatCard label="Current Contributors" value={funderCount?.toString() ?? "—"} sub="Records reset on withdrawal" />
        <StatCard
          label="Previous Withdrawal"
          value={previous ? `${formatEth(previous.amount)} ETH` : "None yet"}
          sub={previous ? `${formatUtc(previous.timestamp).split(" · ")[0]} · ${usd(previous.amount)}` : undefined}
        />
        <StatCard label="ETH/USD Price" value={price ? formatUsd(price) : "—"} sub="Chainlink · Sepolia feed" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="text-xl font-semibold">Withdraw funds</h2>
          <p className="mt-1 text-sm text-muted">The entire contract balance is sent to the owner wallet.</p>
          <p className="mt-6 text-5xl font-semibold tracking-tight">{formatEth(balance)} ETH</p>
          <p className="mt-2 text-lg text-muted">≈ {usd(balance)} USD</p>

          <div className="mt-5 rounded-xl border border-line bg-surface-2 p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted">Destination · Contract owner</p>
            <p className="mt-1 font-medium">{shortAddress(owner)}</p>
          </div>
          <p className="mt-4 text-xs text-muted">Network gas is paid separately by the owner.</p>

          <button
            onClick={() => setOpen(true)}
            disabled={!balance || (balance === 0n && !busy)}
            className={`${primaryBtn} mt-5`}
          >
            <ArrowUpRight size={16} />
            {busy ? "Withdrawal in progress…" : "Withdraw Funds"}
          </button>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="text-xl font-semibold">What changes after withdrawal</h2>
          <div className="mt-5 space-y-5 text-sm">
            {[
              ["Funds move to the owner", `All ${formatEth(balance)} ETH leaves the shared contract. The contract balance becomes 0 ETH.`],
              ["Current contributor records reset", `The ${funderCount?.toString() ?? "—"} current-cycle wallet records and their contributed amounts reset to zero.`],
              ["Historical activity stays", "Past contributions remain represented in the historical ledger. A new contract-wide withdrawal event is added."],
              ["Funding can continue", "New contributions start a new cycle. The $50 minimum and ETH-only rule still apply."],
            ].map(([t, b]) => (
              <div key={t}>
                <p className="font-semibold">{t}</p>
                <p className="mt-1 text-muted">{b}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-6">
        <h2 className="text-lg font-semibold">Withdrawal history</h2>
        <p className="mt-1 text-sm text-muted">Contract-wide transfers · permanent historical activity</p>
        {withdrawals.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No withdrawals yet.</p>
        ) : (
          <div className="mt-4 divide-y divide-line">
            {withdrawals.map((w) => (
              <div key={w.hash} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <ArrowUpRight size={16} />
                  </span>
                  <div>
                    <p className="font-semibold">Pool withdrawal</p>
                    <p className="text-xs text-muted">{formatUtc(w.timestamp)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-5">
                  <div className="text-right">
                    <p className="text-lg font-semibold">{formatEth(w.amount)} ETH</p>
                    <p className="text-xs text-muted">{usd(w.amount)} at current quote</p>
                  </div>
                  <span className="flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-medium text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" /> Confirmed
                  </span>
                  <a href={txUrl(w.hash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                    {shortAddress(w.hash)} <ArrowUpRight size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-muted">
          Current records began a new cycle after the latest withdrawal. Historical contributions are still included in the {formatEth(lifetime)} ETH lifetime total.
        </p>
      </section>

      <p className="mt-6 flex items-center gap-2 text-xs text-muted">
        <Shield size={14} /> Only the owner address can call the withdrawal function. Ordinary connected contributors do not see Owner navigation or withdrawal controls.
      </p>

      {/* ---------- Withdrawal modal ---------- */}
      <Modal open={open} onClose={closeModal}>
        {status === "idle" && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Owner / Confirmation</p>
            <h2 className="mt-2 text-2xl font-semibold">Withdraw Funds?</h2>
            <p className="mt-1 text-sm text-muted">
              Send the full contract balance to the owner wallet. This action cannot be reversed.
            </p>
            <p className="mt-5 text-4xl font-semibold">{formatEth(balance)} ETH</p>
            <div className="mt-3 space-y-1 text-sm">
              <p className="text-muted">USD equivalent · <span className="text-fg">{usd(balance)}</span></p>
              <p className="text-muted">Owner destination · <span className="text-fg">{shortAddress(owner)}</span></p>
            </div>
            <div className="mt-4 rounded-lg bg-accent-soft p-3 text-sm">
              <p className="font-semibold text-accent">Current records reset. History remains.</p>
              <p className="mt-1 text-muted">
                All {funderCount?.toString()} current contributor records reset to zero. Past contributions remain in historical activity.
              </p>
            </div>
            <button onClick={confirm} className={`${primaryBtn} mt-5`}>Confirm withdrawal</button>
            <button onClick={closeModal} className={`${secondaryBtn} mt-2`}>Cancel</button>
            <p className="mt-3 text-center text-xs text-muted">Next: approve the withdrawal and gas in your wallet.</p>
          </>
        )}

        {status === "awaiting" && (
          <>
            <h2 className="text-2xl font-semibold">Confirm in your wallet</h2>
            <p className="mt-2 text-sm text-muted">Approve the withdrawal in your wallet. Nothing has been submitted yet.</p>
            <p className="mt-5 text-3xl font-semibold">{formatEth(snap?.amount)} ETH</p>
          </>
        )}

        {status === "pending" && (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Submitted to Sepolia
            </span>
            <h2 className="mt-3 text-2xl font-semibold">Withdrawal pending</h2>
            <p className="mt-2 text-sm text-muted">The owner approved the withdrawal. Waiting for the transaction receipt.</p>
            <div className="mt-4 space-y-1 text-sm">
              <p className="text-muted">Amount · <span className="text-fg">{formatEth(snap?.amount)} ETH</span></p>
              <p className="text-muted">Destination · <span className="text-fg">{shortAddress(owner)}</span></p>
              <p className="text-muted">Transaction · <span className="text-fg">{shortAddress(hash)}</span></p>
            </div>
            <a href={txUrl(hash!)} target="_blank" rel="noreferrer" className={`${secondaryBtn} mt-5`}>
              View on Etherscan <ArrowUpRight size={14} />
            </a>
            <p className="mt-3 text-center text-xs text-muted">You can close this panel. Do not resubmit.</p>
          </>
        )}

        {status === "confirmed" && (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> Confirmed · {shortAddress(hash)}
            </span>
            <h2 className="mt-3 text-2xl font-semibold">Withdrawal complete</h2>
            <p className="mt-2 text-sm text-muted">
              {formatEth(snap?.amount)} ETH was sent to the owner. Current records reset; historical contribution entries remain. The pool is ready for a new cycle.
            </p>
            <a href={txUrl(hash!)} target="_blank" rel="noreferrer" className={`${secondaryBtn} mt-5`}>
              View transaction <ArrowUpRight size={14} />
            </a>
            <button onClick={closeModal} className={`${primaryBtn} mt-2`}>Done</button>
          </>
        )}

        {(status === "declined" || status === "failed" || status === "reverted") && (
          <>
            <h2 className="text-2xl font-semibold">
              {status === "declined" ? "Request declined" : status === "reverted" ? "Transaction failed" : "Could not send"}
            </h2>
            <p className="mt-2 text-sm text-danger">
              {status === "declined"
                ? "You declined the request in your wallet. No funds moved."
                : status === "reverted"
                  ? "The receipt reverted. No funds moved. Network gas may have been spent."
                  : error}
            </p>
            <button onClick={reset} className={`${primaryBtn} mt-5`}>Try again</button>
            <button onClick={closeModal} className={`${secondaryBtn} mt-2`}>Close</button>
          </>
        )}
      </Modal>
    </div>
  );
}