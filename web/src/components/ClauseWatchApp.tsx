"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CHAIN_ID,
  CONTRACT_ADDRESS,
  DEMO_URL,
  EXPLORER,
  GITHUB,
  txUrl,
} from "@/lib/config";
import {
  acknowledge,
  check,
  getOwner,
  getStats,
  getWatch,
  listAlerts,
  listIds,
  registerWatch,
  setStatus,
  type AlertRow,
  type Stats,
  type WatchRow,
} from "@/lib/contracts";
import { fundWithTestGen, getNativeBalance } from "@/lib/genlayer";
import { useWallet } from "./WalletProvider";

const short = (h: string, n = 16) => (h ? `${h.slice(0, n)}…` : "—");

const RESULT_LABEL: Record<string, string> = {
  baseline: "baseline frozen",
  unchanged: "unchanged",
  cosmetic_change: "changed, not material",
  material_change: "MATERIAL CHANGE",
  acknowledged: "acknowledged",
};

export function ClauseWatchApp() {
  const { address, provider, connect, error: walletError } = useWallet();
  const [rows, setRows] = useState<WatchRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [owner, setOwner] = useState("");
  const [gen, setGen] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [tx, setTx] = useState("");

  const [watchId, setWatchId] = useState("demo/terms");
  const [url, setUrl] = useState(DEMO_URL);
  const [label, setLabel] = useState("Demo vendor terms");
  const [criteria, setCriteria] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [ids, o, s, a] = await Promise.all([
        listIds(),
        getOwner(),
        getStats(),
        listAlerts(""),
      ]);
      setOwner(o);
      setStats(s);
      setAlerts(a.slice(0, 10));
      const loaded = await Promise.all(ids.map((id) => getWatch(id)));
      setRows((loaded.filter(Boolean) as WatchRow[]).reverse());
      if (address) setGen(await getNativeBalance(address));
    } catch (e) {
      setMsg(`Error: ${e instanceof Error ? e.message : "read failed"}`);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = async (labelText: string, fn: () => Promise<string | void>) => {
    if (!address || !provider) {
      setMsg("Connect MetaMask for writes");
      return;
    }
    setBusy(labelText);
    setMsg("");
    try {
      const hash = await fn();
      if (hash) setTx(hash);
      await refresh();
      setMsg(`${labelText} OK`);
    } catch (e) {
      setMsg(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy("");
    }
  };

  const acct = address as `0x${string}`;
  const disabled = !!busy || !address;

  return (
    <main className="wrap">
      <header>
        <h1>ClauseWatch</h1>
        <p className="muted">
          Terms, pricing and policy monitoring on GenLayer Studio Dev (chain {CHAIN_ID}).
          Validators freeze the page text under SHA-256 consensus; when it changes, their LLMs
          agree on one boolean: is the change <strong>material</strong> for the stated criteria,
          or just cosmetic churn? Reads work without a wallet.
        </p>
        <p className="muted">
          Contract{" "}
          <a href={EXPLORER} target="_blank" rel="noreferrer">
            <code>{CONTRACT_ADDRESS}</code>
          </a>{" "}
          · owner {short(owner, 10)}
        </p>
        <div className="row">
          {address ? (
            <span className="pill ok">
              {address.slice(0, 6)}…{address.slice(-4)}
            </span>
          ) : (
            <button type="button" onClick={() => void connect()}>
              Connect MetaMask
            </button>
          )}
          {address && (
            <button
              type="button"
              className="ghost"
              disabled={!!busy}
              onClick={() => void run("faucet", () => fundWithTestGen(acct))}
            >
              Get test GEN{gen ? ` (${gen})` : ""}
            </button>
          )}
          <button type="button" className="ghost" onClick={() => void refresh()} disabled={loading}>
            {loading ? "Loading…" : "Refresh on-chain"}
          </button>
          <a className="ghost" href={EXPLORER} target="_blank" rel="noreferrer">
            Explorer
          </a>
          <a className="ghost" href={GITHUB} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
        {(msg || walletError) && (
          <p className={msg.endsWith("OK") ? "okmsg" : "msg"}>{msg || walletError}</p>
        )}
        {busy && <p className="muted">Waiting for GenLayer consensus: {busy}…</p>}
        {tx && (
          <p className="tx">
            last tx{" "}
            <a href={txUrl(tx)} target="_blank" rel="noreferrer">
              {tx}
            </a>
          </p>
        )}
        {stats && (
          <p className="muted">
            {stats.watches} watches · {stats.checks} checks · {stats.material_alerts} material /{" "}
            {stats.cosmetic_alerts} cosmetic alerts
          </p>
        )}
      </header>

      <section className="card">
        <h2>Watches</h2>
        {rows.length === 0 && <p className="muted">No watches yet</p>}
        {rows.map((w) => (
          <div key={w.watch_id} className="card">
            <strong>{w.watch_id}</strong> · {w.label} · {w.status}
            <div className="muted">
              {w.url}
              <br />
              baseline v{w.baseline_version} · <code>sha256 {short(w.baseline_hash)}</code>
              <br />
              last result: <strong>{RESULT_LABEL[w.last_result] ?? w.last_result}</strong> ·{" "}
              {w.checks} checks · {w.material_changes} material
              {w.pending_hash && (
                <>
                  <br />
                  pending: <code>sha256 {short(w.pending_hash)}</code> — “{w.pending_preview}”
                </>
              )}
            </div>
            <div className="row">
              <button
                type="button"
                disabled={disabled}
                onClick={() => void run("check", () => check(acct, provider, w.watch_id))}
              >
                check now
              </button>
              <button
                type="button"
                className="ghost"
                disabled={disabled || !w.pending_hash}
                onClick={() =>
                  void run("acknowledge", () => acknowledge(acct, provider, w.watch_id))
                }
              >
                acknowledge (new baseline)
              </button>
              <button
                type="button"
                className="ghost"
                disabled={disabled}
                onClick={() =>
                  void run("set_status", () =>
                    setStatus(
                      acct,
                      provider,
                      w.watch_id,
                      w.status === "active" ? "paused" : "active",
                    ),
                  )
                }
              >
                {w.status === "active" ? "pause" : "resume"}
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>Register a watch</h2>
        <p className="muted">
          Validators fetch the page and freeze its text as baseline v1. The demo page lives in this
          repository, so its history is public.
        </p>
        <label htmlFor="watch_id">watch_id</label>
        <input id="watch_id" value={watchId} onChange={(e) => setWatchId(e.target.value)} />
        <label htmlFor="url">url (https)</label>
        <input id="url" value={url} onChange={(e) => setUrl(e.target.value)} />
        <label htmlFor="label">label</label>
        <input id="label" value={label} onChange={(e) => setLabel(e.target.value)} />
        <label htmlFor="criteria">criteria (empty = contract default)</label>
        <textarea
          id="criteria"
          rows={3}
          value={criteria}
          onChange={(e) => setCriteria(e.target.value)}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            void run("register_watch", () =>
              registerWatch(acct, provider, watchId, url, label, criteria),
            )
          }
        >
          register_watch (freeze baseline)
        </button>
      </section>

      <section className="card">
        <h2>Latest alerts</h2>
        {alerts.length === 0 && <p className="muted">No alerts yet</p>}
        <ul>
          {alerts.map((a) => (
            <li key={a.alert_id}>
              <strong>{a.material ? "MATERIAL" : "cosmetic"}</strong> · {a.alert_id} · {a.watch_id}{" "}
              (baseline v{a.baseline_version})
              <div className="muted">
                <code>
                  {short(a.previous_hash, 10)} → {short(a.current_hash, 10)}
                </code>{" "}
                — “{a.preview}”
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
