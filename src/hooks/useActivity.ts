import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { decodeEventLog, getAbiItem, type Address, type Hex } from "viem";
import { fundMeAbi } from "../contract/abi";
import { DEPLOY_BLOCK, FUNDME_ADDRESS } from "../contract/constants";

export type ActivityEvent = {
  type: "contribution" | "withdrawal";
  wallet: Address;
  amount: bigint;
  hash: Hex;
  blockNumber: bigint;
  logIndex: number;
  timestamp: number; // unix seconds
};

const ETHERSCAN_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY as string | undefined;
const CACHE_KEY = `fundme:activity:v2:${FUNDME_ADDRESS.toLowerCase()}`;
const OVERLAP = 10n;

/* ---------- localStorage cache ---------- */

type Stored = Omit<ActivityEvent, "amount" | "blockNumber"> & {
  amount: string;
  blockNumber: string;
};

const loadCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as { lastBlock: string; events: Stored[] };
    return {
      lastBlock: BigInt(s.lastBlock),
      events: s.events.map((e) => ({
        ...e,
        amount: BigInt(e.amount),
        blockNumber: BigInt(e.blockNumber),
      })) as ActivityEvent[],
    };
  } catch {
    return null;
  }
};

const saveCache = (lastBlock: bigint, events: ActivityEvent[]) => {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        lastBlock: lastBlock.toString(),
        events: events.map((e) => ({
          ...e,
          amount: e.amount.toString(),
          blockNumber: e.blockNumber.toString(),
        })),
      })
    );
  } catch {
    /* ignore */
  }
};

const keyOf = (e: { hash: Hex; logIndex: number }) => `${e.hash}-${e.logIndex}`;

/* ---------- source 1: Etherscan (fast) ---------- */

type EsLog = {
  topics: Hex[];
  data: Hex;
  blockNumber: Hex;
  timeStamp: Hex;
  logIndex: Hex;
  transactionHash: Hex;
};

function decodeLog(row: {
  topics: Hex[];
  data: Hex;
  blockNumber: bigint;
  logIndex: number;
  hash: Hex;
  timestamp: number;
}): ActivityEvent | null {
  try {
    const d = decodeEventLog({
      abi: fundMeAbi,
      data: row.data,
      topics: row.topics as [Hex, ...Hex[]],
    });
    const base = {
      hash: row.hash,
      blockNumber: row.blockNumber,
      logIndex: row.logIndex,
      timestamp: row.timestamp,
    };
    if (d.eventName === "Funded") {
      return { ...base, type: "contribution", wallet: d.args.funder, amount: d.args.amount };
    }
    if (d.eventName === "Withdrawn") {
      return { ...base, type: "withdrawal", wallet: d.args.owner, amount: d.args.amount };
    }
  } catch {
    /* not one of our events */
  }
  return null;
}

async function viaEtherscan(from: bigint): Promise<ActivityEvent[]> {
  const out: ActivityEvent[] = [];
  let fromBlock = from;

  for (let guard = 0; guard < 50; guard++) {
    const url =
      `https://api.etherscan.io/v2/api?chainid=11155111&module=logs&action=getLogs` +
      `&address=${FUNDME_ADDRESS}&fromBlock=${fromBlock}&toBlock=latest` +
      `&page=1&offset=1000&apikey=${ETHERSCAN_KEY}`;
    const json = await (await fetch(url)).json();

    if (json.status !== "1") {
      if (String(json.message).toLowerCase().includes("no records")) break;
      throw new Error(typeof json.result === "string" ? json.result : json.message);
    }

    const rows = json.result as EsLog[];
    for (const r of rows) {
      const ev = decodeLog({
        topics: r.topics,
        data: r.data,
        blockNumber: BigInt(r.blockNumber),
        logIndex: r.logIndex === "0x" ? 0 : Number(r.logIndex),
        hash: r.transactionHash,
        timestamp: r.timeStamp === "0x" ? 0 : Number(r.timeStamp),
      });
      if (ev) out.push(ev);
    }

    if (rows.length < 1000) break;
    const last = BigInt(rows[rows.length - 1].blockNumber);
    fromBlock = last > fromBlock ? last : fromBlock + 1n; // duplicates are removed by key later
  }
  return out;
}

/* ---------- source 2: plain RPC fallback ---------- */

const fundedEvent = getAbiItem({ abi: fundMeAbi, name: "Funded" });
const withdrawnEvent = getAbiItem({ abi: fundMeAbi, name: "Withdrawn" });
const CHUNK = BigInt(import.meta.env.VITE_LOG_CHUNK ?? 10_000);
const CONCURRENCY = 4;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function retry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      await sleep(500 * 2 ** i);
    }
  }
  throw last;
}

type Client = NonNullable<ReturnType<typeof usePublicClient>>;

async function viaRpc(c: Client, from: bigint, latest: bigint): Promise<ActivityEvent[]> {
  const queue: [bigint, bigint][] = [];
  for (let a = from; a <= latest; a += CHUNK) {
    const b = a + CHUNK - 1n;
    queue.push([a, b > latest ? latest : b]);
  }

  const out: ActivityEvent[] = [];
  const worker = async () => {
    while (queue.length) {
      const [fromBlock, toBlock] = queue.shift()!;
      const logs = await retry(() =>
        c.getLogs({
          address: FUNDME_ADDRESS,
          events: [fundedEvent, withdrawnEvent],
          fromBlock,
          toBlock,
        })
      );
      for (const log of logs) {
        const base = {
          hash: log.transactionHash,
          blockNumber: log.blockNumber,
          logIndex: log.logIndex,
          timestamp: 0,
        };
        if (log.eventName === "Funded") {
          out.push({ ...base, type: "contribution", wallet: log.args.funder!, amount: log.args.amount! });
        } else if (log.eventName === "Withdrawn") {
          out.push({ ...base, type: "withdrawal", wallet: log.args.owner!, amount: log.args.amount! });
        }
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // logs have no timestamps: one lookup per unique block
  const blocks = [...new Set(out.map((e) => e.blockNumber))];
  const stamps = new Map<bigint, number>();
  for (let i = 0; i < blocks.length; i += 5) {
    const part = blocks.slice(i, i + 5);
    const got = await Promise.all(part.map((blockNumber) => retry(() => c.getBlock({ blockNumber }))));
    got.forEach((b, idx) => stamps.set(part[idx], Number(b.timestamp)));
  }
  return out.map((e) => ({ ...e, timestamp: stamps.get(e.blockNumber) ?? 0 }));
}

/* ---------- hook ---------- */

export function useActivity() {
  const client = usePublicClient();

  return useQuery({
    queryKey: ["activity", FUNDME_ADDRESS],
    enabled: !!client,
    staleTime: 30_000,
    retry: 1,
    queryFn: async (): Promise<ActivityEvent[]> => {
      const c = client!;
      const latest = await c.getBlockNumber();

      const cached = loadCache();
      const start =
        cached && cached.lastBlock - OVERLAP > DEPLOY_BLOCK
          ? cached.lastBlock - OVERLAP
          : DEPLOY_BLOCK;

      const fresh = ETHERSCAN_KEY
        ? await viaEtherscan(start)
        : await viaRpc(c, start, latest);

      const map = new Map<string, ActivityEvent>();
      for (const e of cached?.events ?? []) map.set(keyOf(e), e);
      for (const e of fresh) map.set(keyOf(e), e);

      const all = [...map.values()].sort((a, b) =>
        a.blockNumber === b.blockNumber
          ? b.logIndex - a.logIndex
          : Number(b.blockNumber - a.blockNumber)
      );

      saveCache(latest, all);
      return all;
    },
  });
}