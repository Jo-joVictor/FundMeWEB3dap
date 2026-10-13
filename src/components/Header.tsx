import { NavLink } from "react-router-dom";
import { Layers, Moon, Sun } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { useIsOwner } from "../hooks/useIsOwner";
import WalletButton from "./WalletButton";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm transition-colors ${
    isActive
      ? "text-accent underline underline-offset-4"
      : "text-muted hover:text-fg"
  }`;

export default function Header() {
  const { theme, toggle } = useTheme();
  const isOwner = useIsOwner();

  return (
    <header className="border-b border-line bg-bg">
      <div className="mx-auto flex max-w-[1312px] flex-wrap items-center justify-between gap-y-3 px-4 py-4 sm:px-6">
        <NavLink to="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <Layers size={18} />
          </span>
          <span className="text-xl font-semibold">FundMe</span>
        </NavLink>

        <nav className="order-3 flex w-full justify-center gap-7 md:order-none md:w-auto">
          <NavLink to="/" end className={linkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/activity" className={linkClass}>
            Activity
          </NavLink>
          <NavLink to="/transparency" className={linkClass}>
            Transparency
          </NavLink>
          {isOwner && (
            <NavLink to="/owner" className={linkClass}>
              Owner
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="text-muted hover:text-fg"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <WalletButton />
        </div>
      </div>
    </header>
  );
}