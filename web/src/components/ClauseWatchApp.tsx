"use client";

import { useCallback, useEffect, useState } from "react";
import { CHAIN_ID, CONTRACT_ADDRESS, DEMO_URL, EXPLORER, GITHUB, txUrl } from "@/lib/config";
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

const VERDICT: Record<string, { text: string; tone: string }> = {
  baseline: { text: "baseline frozen", tone: "neutral" },
  unchanged: { text: "unchanged", tone: "cosmetic" },
  cosmetic_change: { text: "changed · not material", tone: "cosmetic" },
  material_change: { text: "material change", tone: "material" },
  acknowledged: { text: "acknowledged", tone: "neutral" },
};

/** The hero illustration: a beam sweeping a document, one clause lighting up. */
function Scanner() {
  return (
    <div className="scanner" aria-hidden="true">
      <div className="paper">
        <div className="ln mid" />
        <div className="ln" />
        <div className="ln clause" />
        <div className="ln short" />
        <div className="ln mid" />
        <div className="ln" />
        <div className="ln short" />
      </div>
      <div className="beam" />
      <div className="verdicts">
        <span className="hit">material → alert</span>
        <span className="quiet">cosmetic → quiet</span>
      </div>
    </div>
  );
}

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

  const [watchId, setWatchId] = useState("demo/terms-2");
  const [url, setUrl] = useState(DEMO_URL);
  const [label, setLabel] = useState("Demo vendor terms");
  const [criteria, setCriteria] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [ids, o, s, a] = await Promise.all([listIds(), getOwner(), getStats(), listAlerts("")]);
      setOwner(o);
      setStats(s);
      setAlerts(a.slice(0, 8));
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

  const run = async (name: string, fn: () => Promise<string | void>) => {
    if (!address || !provider) {
      setMsg("Connect MetaMask for writes");
      return;
    }
    setBusy(name);
    setMsg("");
    try {
      const hash = await fn();
      if (hash) setTx(hash);
      await refresh();
      setMsg(`${name} OK`);
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
      <section className="hero">
        <div>
          <h1>
            Clause<span className="accent">Watch</span>
          </h1>
          <p className="lede">
            Terms, pricing and policy pages, watched by GenLayer validators. The page text is frozen
            under SHA-256 consensus; when it changes, validators&apos; LLMs agree on one thing —
            is the change <strong>material</strong>, or just cosmetic churn?
          </p>
          <div className="chips">
            <span className="chip">
              chain <b>{CHAIN_ID}</b>
            </span>
            {stats && (
              <>
                <span className="chip">
                  watches <b>{stats.watches}</b>
                </span>
                <span className="chip">
                  checks <b>{stats.checks}</b>
                </span>
                <span className="chip hot">
                  material <b>{stats.material_alerts}</b>
                </span>
                <span className="chip">
                  cosmetic <b>{stats.cosmetic_alerts}</b>
                </span>
              </>
            )}
          </div>
          <p className="hashline">
            contract{" "}
            <a href={EXPLORER} target="_blank" rel="noreferrer">
              <code>{CONTRACT_ADDRESS}</code>
            </a>{" "}
            · owner <code>{short(owner, 10)}</code>
          </p>
          <div className="row">
            {address ? (
              <span className="pill">
                <span className="dot" />
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
            <button
              type="button"
              className="ghost"
              onClick={() => void refresh()}
              disabled={loading}
            >
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
          {busy && (
            <p className="working">
              <span className="spinner" />
              waiting for GenLayer consensus: {busy}…
            </p>
          )}
          {tx && (
            <p className="tx">
              last tx{" "}
              <a href={txUrl(tx)} target="_blank" rel="noreferrer">
                {tx}
              </a>
            </p>
          )}
        </div>
        <Scanner />
      </section>

      <section>
        <h2>Watches</h2>
        {rows.length === 0 && <p className="muted">No watches yet — register one below.</p>}
        {rows.map((w) => {
          const verdict = VERDICT[w.last_result] ?? { text: w.last_result, tone: "neutral" };
          return (
            <article
              key={w.watch_id}
              className={`card watch ${verdict.tone === "material" ? "material" : "clean"}`}
            >
              <div className="head">
                <span className="id">{w.watch_id}</span>
                <span className={`verdict ${verdict.tone}`}>{verdict.text}</span>
              </div>
              <p className="muted">
                {w.label} · {w.status} ·{" "}
                <a href={w.url} target="_blank" rel="noreferrer">
                  {w.url}
                </a>
              </p>
              <p className="hashline">
                baseline v{w.baseline_version} · <code>sha256 {short(w.baseline_hash)}</code> ·{" "}
                {w.checks} checks · {w.material_changes} material
              </p>
              {w.pending_hash && (
                <div className="diff">
                  <strong>Pending version</strong> · <code>sha256 {short(w.pending_hash)}</code>
                  <div className="muted">“{w.pending_preview}”</div>
                </div>
              )}
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
                  acknowledge → baseline v{w.baseline_version + 1}
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
            </article>
          );
        })}
      </section>

      <section className="card">
        <h2>Register a watch</h2>
        <p className="muted">
          Validators fetch the page and freeze its text as baseline v1. The demo page lives in this
          repository, so every change it reacts to is a public commit.
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
          register_watch → freeze baseline
        </button>
      </section>

      <section className="card">
        <h2>Alert timeline</h2>
        {alerts.length === 0 && <p className="muted">No alerts yet.</p>}
        <ul className="timeline">
          {alerts.map((a) => (
            <li key={a.alert_id} className={a.material ? "material" : ""}>
              <strong>{a.material ? "MATERIAL" : "cosmetic"}</strong> · {a.watch_id} ·{" "}
              <span className="muted">
                {a.alert_id}, against baseline v{a.baseline_version}
              </span>
              <div className="hashline">
                <code>
                  {short(a.previous_hash, 10)} → {short(a.current_hash, 10)}
                </code>
              </div>
              <div className="muted">“{a.preview}”</div>
            </li>
          ))}
        </ul>
      </section>

      <footer className="foot">
        Reads work without a wallet. Writes go through MetaMask on GenLayer Studio Dev (chain{" "}
        {CHAIN_ID}) with a fee deposit on every transaction.
      </footer>
    </main>
  );
}
