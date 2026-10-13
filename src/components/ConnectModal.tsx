import { useState } from "react";
import { ChevronRight, Link2, Wallet, CircleDollarSign } from "lucide-react";
import { useConnect } from "wagmi";
import Modal from "./Modal";
import { useWalletModal } from "../context/WalletModal";

const icons: Record<string, typeof Wallet> = {
  metaMask: Wallet,
  coinbaseWalletSDK: CircleDollarSign,
  walletConnect: Link2,
};

export default function ConnectModal() {
  const { isOpen, closeModal } = useWalletModal();
  const { connectors, connect, isPending, error, reset } = useConnect();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const close = () => {
    reset();
    setPendingId(null);
    closeModal();
  };

  return (
    <Modal open={isOpen} onClose={close}>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">
        Wallet / Selection dialog
      </p>
      <h2 className="mt-2 text-2xl font-semibold">Connect Wallet</h2>
      <p className="mt-1 text-sm text-muted">
        Choose a wallet to connect to FundMe.
      </p>

      <div className="mt-5 space-y-3">
        {connectors.map((connector) => {
          const Icon = icons[connector.id] ?? Wallet;
          const busy = isPending && pendingId === connector.uid;
          return (
            <button
              key={connector.uid}
              disabled={isPending}
              onClick={() => {
                setPendingId(connector.uid);
                connect({ connector }, { onSuccess: close });
              }}
              className="flex w-full items-center justify-between rounded-xl border border-line bg-surface-2 px-4 py-3.5 text-left text-sm font-medium transition-colors hover:border-accent disabled:opacity-60"
            >
              <span className="flex items-center gap-3">
                <Icon size={18} className="text-accent" />
                {connector.name}
              </span>
              {busy ? (
                <span className="text-xs text-muted">Connecting…</span>
              ) : (
                <ChevronRight size={16} className="text-muted" />
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error.message.split("\n")[0]}
        </p>
      )}

      <p className="mt-5 text-center text-xs text-muted">
        Connecting does not send funds. Never share your recovery phrase.
      </p>

      <button
        onClick={close}
        className="mt-4 w-full rounded-lg border border-line py-2.5 text-sm font-semibold hover:bg-surface-2"
      >
        Cancel
      </button>
    </Modal>
  );
}