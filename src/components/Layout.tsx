import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import ConnectModal from "./ConnectModal";
import { WalletModalProvider } from "../context/WalletModal";
import { ToastProvider } from "../context/Toast";

export default function Layout() {
  const { pathname } = useLocation();
  const crumb = pathname.startsWith("/owner") ? "OWNER" : "SHARED POOL";

  return (
    <ToastProvider>
      <WalletModalProvider>
        <div className="min-h-screen bg-bg text-fg">
          <Header />
          <main className="mx-auto max-w-[1312px] px-4 sm:px-6">
            <div className="flex items-center justify-between py-6 text-xs text-muted">
              <span>WORKSPACE / {crumb}</span>
              <span>Live data · Sepolia testnet</span>
            </div>
            <Outlet />
          </main>
          <Footer />
        </div>
        <ConnectModal />
      </WalletModalProvider>
    </ToastProvider>
  );
}