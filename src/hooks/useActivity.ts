import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { getAbiItem, type Address, type Hex } from "viem";
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

const fundedEvent = getAbiItem({ abi: fundMeAbi, name: "Funded" });
const withdrawnEvent = getAbiItem({ abi: fundMeAbi, name: "Withdrawn" });

// Public RPCs limit getLogs ranges. If you see range errors, lower this to 10_000n.
const CHUNK = 50_000n;
const PARALLEL = 5;

export function useActivity() {
  const client = usePublicClient();

  return useQuery({
    queryKey: ["activity", FUNDME_ADDRESS],
    enabled: !!client,
    staleTime: 30_000,
    queryFn: async (): Promise<ActivityEvent[]> => {
      const latest = await client!.getBlockNumber();

      const ranges: [bigint, bigint][] = [];
      for (let from = DEPLOY_BLOCK; from <= latest; from += CHUNK) {
        const to = from + CHUNK - 1n;
        ranges.push([from, to > latest ? latest : to]);
      }

      const events: ActivityEvent[] = [];
      const blockSet = new Set<bigint>();

      for (let i = 0; i < ranges.length; i += PARALLEL) {
        const batch = ranges.slice(i, i + PARALLEL);
        const results = await Promise.all(
          batch.map(([fromBlock, toBlock]) =>
            Promise.all([
              client!.getLogs({ address: FUNDME_ADDRESS, event: fundedEvent, fromBlock, toBlock }),
              client!.getLogs({ address: FUNDME_ADDRESS, event: withdrawnEvent, fromBlock, toBlock }),
            ])
          )
        );

        for (const [funded, withdrawn] of results) {
          for (const log of funded) {
            blockSet.add(log.blockNumber);
            events.push({
              type: "contribution",
              wallet: log.args.funder!,
              amount: log.args.amount!,
              hash: log.transactionHash,
              blockNumber: log.blockNumber,
              logIndex: log.logIndex,
              timestamp: 0,
            });
          }
          for (const log of withdrawn) {
            blockSet.add(log.blockNumber);
            events.push({
              type: "withdrawal",
              wallet: log.args.owner!,
              amount: log.args.amount!,
              hash: log.transactionHash,
              blockNumber: log.blockNumber,
              logIndex: log.logIndex,
              timestamp: 0,
            });
          }
        }
      }

      // Logs don't carry timestamps, so look up each unique block once
      const blocks = [...blockSet];
      const stamps = new Map<bigint, number>();
      for (let i = 0; i < blocks.length; i += 10) {
        const part = blocks.slice(i, i + 10);
        const got = await Promise.all(
          part.map((blockNumber) => client!.getBlock({ blockNumber }))
        );
        got.forEach((b, idx) => stamps.set(part[idx], Number(b.timestamp)));
      }

      return events
        .map((e) => ({ ...e, timestamp: stamps.get(e.blockNumber) ?? 0 }))
        .sort((a, b) =>
          a.blockNumber === b.blockNumber
            ? b.logIndex - a.logIndex
            : Number(b.blockNumber - a.blockNumber)
        );
    },
  });
}