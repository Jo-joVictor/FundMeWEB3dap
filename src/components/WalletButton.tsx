import { useAccount, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { useWalletModal } from "../context/WalletModal";
import WalletMenu from "./WalletMenu";

export default function WalletButton() {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  const { openModal } = useWalletModal();

  const wrongNetwork = isConnected && chainId !== sepolia.id;

  return (
    <div className="flex items-center gap-3">
      {wrongNetwork ? (
        <button
          onClick={() => switchChain({ chainId: sepolia.id })}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-full bg-danger-soft px-3 py-1 text-xs font-medium text-danger disabled:opacity-60"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-danger" />
          {isPending ? "Switching…" : "Wrong network · Switch to Sepolia"}
        </button>
      ) : (
        <span className="hidden items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-medium text-success sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Sepolia
        </span>
      )}

      {isConnected ? (
        <WalletMenu />
      ) : (
        <button
          onClick={openModal}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          Connect Wallet
        </button>
      )}
    </div>
  );
}