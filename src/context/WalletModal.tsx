import { createContext, useContext, useState, type ReactNode } from "react";

type Ctx = { isOpen: boolean; openModal: () => void; closeModal: () => void };

const WalletModalContext = createContext<Ctx | null>(null);

export function WalletModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <WalletModalContext.Provider
      value={{
        isOpen,
        openModal: () => setIsOpen(true),
        closeModal: () => setIsOpen(false),
      }}
    >
      {children}
    </WalletModalContext.Provider>
  );
}

export function useWalletModal() {
  const ctx = useContext(WalletModalContext);
  if (!ctx) throw new Error("useWalletModal must be used in WalletModalProvider");
  return ctx;
}