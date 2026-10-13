export const FUNDME_ADDRESS =
  "0x383F4CFca357e2F9E1C9BaF69f0eaF24a1b8CA22" as const;

export const DEPLOY_BLOCK = 9293068n;

export const ETHERSCAN = "https://sepolia.etherscan.io";

export const txUrl = (hash: string) => `${ETHERSCAN}/tx/${hash}`;
export const addressUrl = (addr: string) => `${ETHERSCAN}/address/${addr}`;