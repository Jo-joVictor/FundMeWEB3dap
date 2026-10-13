import { ArrowUpRight } from "lucide-react";
import { FUNDME_ADDRESS, addressUrl } from "../contract/constants";
import { shortAddress } from "../lib/format";

export default function Footer() {
  return (
    <footer className="mx-auto mt-16 max-w-[1312px] px-4 sm:px-6">
      <div className="flex items-center justify-between border-t border-line py-6 text-xs text-muted">
        <span>One contract. One shared funding pool.</span>
        <a
          href={addressUrl(FUNDME_ADDRESS)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-accent hover:underline"
        >
          {shortAddress(FUNDME_ADDRESS)} <ArrowUpRight size={12} /> Etherscan
        </a>
      </div>
    </footer>
  );
}