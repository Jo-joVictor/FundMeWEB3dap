import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Link2, RefreshCw } from "lucide-react";
import { useAccount, useBalance, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { usePoolStats, useMyContribution } from "../hooks/useFundMeReads";
import { useFund } from "../hooks/useFund";
import { useWalletModal } from "../context/WalletModal";
import { FUNDME_ADDRESS, txUrl } from "../contract/constants";
import {
  ethToUsd,
  formatEth,
  formatUsd,
  minEthWei,
  parseEthInput,
  shortAddress,
  usdToWei,
  weiToInput,
} from "../lib/format";

const PRESETS = [50, 100, 250, 500];

const primaryBtn =
  "flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50";
const secondaryBtn =
  "flex w-full items-center justify-center gap-1.5 rounded-lg border border-line py-3 text-sm font-semibold hover:bg-surface-2";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default function ContributionCard() {
  const { isConnected, address, chainId } = useAccount();
  const { openModal } = useWalletModal();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { data: walletBal } = useBalance({ address });
  const { price, minUsd, balance, priceFailed, refetch } = usePoolStats();
  const { data: mine } = useMyContribution();
  const { fund, status, hash, error, reset } = useFund();

  const [amount, setAmount] = useState("");

  // Default to the $100 chip once the quote loads
  useEffect(() => {
    if (!amount && price) setAmount(weiToInput(usdToWei(100, price)));
  }, [price, amount]);

  const wrongNetwork = isConnected && chainId !== sepolia.id;
  const quoteReady = price !== undefined && minUsd !== undefined;
  const wei = parseEthInput(amount);
  const usd = wei !== undefined && price ? ethToUsd(wei, price) : undefined;
  const minWei = price && minUsd ? minEthWei(minUsd, price) : undefined;
  const belowMin =
    wei !== undefined && usd !== undefined && minUsd !== undefined && usd < minUsd;
  const insufficient = wei !== undefined && !!walletBal && wei > walletBal.value;
  const invalid = amount !== "" && wei === undefined;

  const submit = () => {
    if (wei !== undefined) fund(wei);
  };

  const Header = (
    <div className="flex items-start justify-between">
      <h2 className="text-xl font-semibold">Make a contribution</h2>
      <ArrowDownLeft size={16} className="text-accent" />
    </div>
  );

  /* ---------- Transaction states ---------- */

  if (status === "awaiting") {
    return (
      <Card>
        <h2 className="text-xl font-semibold">Confirm in your wallet</h2>
        <p className="mt-2 text-sm text-muted">
          Review the amount and network gas in your wallet. Nothing has been
          submitted yet.
        </p>
        <div className="mt-5 space-y-2">
          <Row label="Contribution" value={`${amount} ETH · ${formatUsd(usd)}`} />
          <Row label="To contract" value={shortAddress(FUNDME_ADDRESS)} />
          <Row label="Network" value="Sepolia" />
        </div>
        <p className="mt-5 text-center text-xs text-muted">
          No transaction hash until you approve and submit.
        </p>
      </Card>
    );
  }

  if (status === "pending") {
    return (
      <Card>
        <h2 className="text-xl font-semibold">Contribution pending</h2>
        <p className="mt-2 text-sm text-muted">
          Your transaction is on Sepolia. Wait for confirmation before sending
          another contribution.
        </p>
        <div className="mt-5 space-y-2">
          <Row label="Amount" value={`${amount} ETH · ${formatUsd(usd)}`} />
          <Row label="Transaction" value={shortAddress(hash)} />
        </div>
        <a href={txUrl(hash!)} target="_blank" rel="noreferrer" className={`${secondaryBtn} mt-5`}>
          View on Etherscan <ArrowUpRight size={14} />
        </a>
        <button disabled className={`${primaryBtn} mt-2 bg-surface-2 !text-muted`}>
          Awaiting confirmation…
        </button>
      </Card>
    );
  }

  if (status === "confirmed") {
    return (
      <Card>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Confirmed on Sepolia
        </span>
        <h2 className="mt-3 text-xl font-semibold">Contribution confirmed</h2>
        <p className="mt-2 text-sm text-muted">
          Your {amount} ETH contribution was added to the shared pool.
        </p>
        <div className="mt-5 space-y-2">
          <Row
            label="Updated pool"
            value={`${formatEth(balance)} ETH${price && balance !== undefined ? ` · ${formatUsd(ethToUsd(balance, price))}` : ""}`}
          />
          <Row
            label="Your current total"
            value={`${formatEth(mine)} ETH${price && mine !== undefined ? ` · ${formatUsd(ethToUsd(mine, price))}` : ""}`}
          />
        </div>
        <a href={txUrl(hash!)} target="_blank" rel="noreferrer" className={`${secondaryBtn} mt-5`}>
          View transaction <ArrowUpRight size={14} />
        </a>
        <button onClick={reset} className={`${primaryBtn} mt-2`}>
          Contribute again
        </button>
      </Card>
    );
  }

  if (status === "declined") {
    return (
      <Card>
        <h2 className="text-xl font-semibold">Request declined</h2>
        <p className="mt-2 text-sm text-danger">
          You declined the request in your wallet.
        </p>
        <p className="mt-2 text-sm text-muted">
          No ETH was sent and no network gas was spent. Your {amount} ETH amount
          is saved.
        </p>
        <button
          onClick={() => {
            reset();
            submit();
          }}
          className={`${primaryBtn} mt-5`}
        >
          Try again
        </button>
        <button onClick={reset} className={`${secondaryBtn} mt-2`}>
          Edit amount
        </button>
      </Card>
    );
  }

  if (status === "reverted" || status === "failed") {
    return (
      <Card>
        <h2 className="text-xl font-semibold">
          {status === "reverted" ? "Transaction failed" : "Could not send"}
        </h2>
        <div className="mt-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">
          {status === "reverted"
            ? "The receipt reverted. No contribution was added. Network gas may have been spent. Refresh the quote and retry."
            : error ?? "Something went wrong before the transaction was submitted."}
        </div>
        {hash && (
          <a href={txUrl(hash)} target="_blank" rel="noreferrer" className={`${secondaryBtn} mt-4`}>
            View failed receipt <ArrowUpRight size={14} />
          </a>
        )}
        <button
          onClick={() => {
            reset();
            refetch();
          }}
          className={`${primaryBtn} mt-2`}
        >
          Review &amp; retry
        </button>
      </Card>
    );
  }

  /* ---------- Idle form ---------- */

  return (
    <Card>
      {Header}
      <p className="mt-3 text-sm text-muted">
        Your ETH goes directly to the FundMe contract. Contributions are not
        refundable.
      </p>

      {priceFailed && (
        <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          We couldn't read the oracle quote. Funding is paused until a current
          conversion is available.
        </p>
      )}

      <label className="mt-5 block text-sm font-medium">ETH amount</label>
      <div
        className={`mt-2 flex items-center rounded-xl border bg-surface-2 px-4 py-3 ${
          belowMin || invalid || insufficient
            ? "border-danger"
            : "border-accent"
        }`}
      >
        <input
          inputMode="decimal"
          value={amount}
          placeholder="0.000"
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9.]/g, "");
            if ((v.match(/\./g) ?? []).length <= 1) setAmount(v);
          }}
          className="w-full bg-transparent text-2xl font-medium outline-none placeholder:text-muted"
        />
        <span className="text-sm text-muted">ETH</span>
      </div>

      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>≈ {usd !== undefined ? formatUsd(usd) : "—"} USD</span>
        <span>
          $50 minimum · {minWei ? `${formatEth(minWei, 4)} ETH` : "—"}
        </span>
      </div>

      {belowMin && (
        <p className="mt-2 text-xs text-danger">
          Enter at least {formatEth(minWei, 4)} ETH ($50.00) at the current quote.
        </p>
      )}
      {insufficient && !belowMin && (
        <p className="mt-2 text-xs text-danger">
          Amount exceeds your wallet balance.
        </p>
      )}
      {invalid && <p className="mt-2 text-xs text-danger">Enter a valid ETH amount.</p>}

      <div className="mt-4 grid grid-cols-4 gap-2">
        {PRESETS.map((p) => {
          const chipWei = price ? usdToWei(p, price) : undefined;
          const active = chipWei !== undefined && weiToInput(chipWei) === amount;
          return (
            <button
              key={p}
              disabled={!price}
              onClick={() => chipWei && setAmount(weiToInput(chipWei))}
              className={`rounded-lg border py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                active
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line hover:border-accent"
              }`}
            >
              ${p}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex items-start gap-2 text-xs text-muted">
        <Link2 size={14} className="mt-0.5 shrink-0" />
        <div>
          <p>
            Chainlink ETH price ·{" "}
            {price ? formatUsd(price) : priceFailed ? "unavailable" : "loading…"}
          </p>
          <p>Sepolia price feed · minimum is re-checked by the contract</p>
        </div>
      </div>

      <div className="mt-5">
        {!isConnected ? (
          <button onClick={openModal} className={primaryBtn}>
            Connect Wallet
          </button>
        ) : wrongNetwork ? (
          <button
            onClick={() => switchChain({ chainId: sepolia.id })}
            disabled={switching}
            className={primaryBtn}
          >
            {switching ? "Switching…" : "Switch to Sepolia"}
          </button>
        ) : priceFailed ? (
          <button onClick={() => refetch()} className={primaryBtn}>
            <RefreshCw size={16} /> Refresh quote
          </button>
        ) : !quoteReady ? (
          <button disabled className={primaryBtn}>
            Loading quote…
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={wei === undefined || belowMin || insufficient}
            className={primaryBtn}
          >
            <ArrowRight size={16} /> Fund with ETH
          </button>
        )}
      </div>

      {belowMin && minWei && (
        <button
          onClick={() => setAmount(weiToInput(minWei))}
          className={`${secondaryBtn} mt-2`}
        >
          Use $50 minimum
        </button>
      )}

      <p className="mt-4 text-center text-xs text-muted">
        {!isConnected
          ? "Connecting does not send funds."
          : "Network gas is extra. Review the final amount in your wallet."}
      </p>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      id="contribute"
      className="rounded-2xl border border-line bg-surface p-6"
    >
      {children}
    </div>
  );
}