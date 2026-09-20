/** Live ClauseWatch deploy on GenLayer Studio Dev (chain 61997). Override via env. */
export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CLAUSEWATCH_ADDRESS ||
  "0x0B32c2f2aFbbf79963D9132f93912694e913bA6d") as `0x${string}`;

/** Studio Dev / Studio Next — chain ID 61997. */
export const CHAIN_ID = 61997;
export const RPC_URL =
  process.env.NEXT_PUBLIC_GENLAYER_RPC || "https://studio-dev.genlayer.com/api";
export const EXPLORER_BASE =
  process.env.NEXT_PUBLIC_GENLAYER_EXPLORER || "https://explorer-studio-dev.genlayer.com";
export const EXPLORER = `${EXPLORER_BASE}/address/${CONTRACT_ADDRESS}`;
export const txUrl = (hash: string) => `${EXPLORER_BASE}/tx/${hash}`;

export const GITHUB = "https://github.com/valentinzubok/ClauseWatch";

/** Demo page that lives in this repo, so anyone can diff its history. */
export const DEMO_URL = "https://valentinzubok.github.io/ClauseWatch/fixtures/terms.html";
