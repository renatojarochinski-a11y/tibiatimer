"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Panel from "@/components/Panel";
import NavTabs from "@/components/NavTabs";
import {
  computeSettlements,
  emptyPlayer,
  parsePartyHuntText,
  type Player,
} from "@/lib/lootSplit";

const STORAGE_KEY = "tibia-loot-state-v1";

interface PersistedState {
  darkMode: boolean;
}

const DEFAULT_STATE: PersistedState = { darkMode: true };

function loadPersisted(): PersistedState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<PersistedState>) };
  } catch {
    // ignora estado corrompido
  }
  return DEFAULT_STATE;
}

function fmt(n: number): string {
  return n.toLocaleString("pt-BR");
}

export default function LootSplitter() {
  const [darkMode, setDarkMode] = useState(DEFAULT_STATE.darkMode);
  const [hydrated, setHydrated] = useState(false);
  const [rawText, setRawText] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const hydrateFromClient = useCallback(() => {
    setDarkMode(loadPersisted().darkMode);
    setHydrated(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hidrata do localStorage, que só existe no cliente
    hydrateFromClient();
  }, [hydrateFromClient]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ darkMode }));
  }, [darkMode, hydrated]);

  function handleParse() {
    const parsed = parsePartyHuntText(rawText);
    if (parsed.length === 0) {
      setParseError(
        "Não encontrei nenhum jogador nesse texto. Copie o texto completo do Party Hunt Analyser (botão “Copy to clipboard” no jogo) e cole aqui."
      );
      return;
    }
    setParseError(null);
    setPlayers(parsed);
  }

  function handleClear() {
    setRawText("");
    setPlayers([]);
    setParseError(null);
  }

  function addPlayer() {
    setPlayers((prev) => [...prev, emptyPlayer(`Jogador ${prev.length + 1}`)]);
  }

  function removePlayer(id: string) {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  }

  function updatePlayer(id: string, field: "name" | "loot" | "supplies", value: string) {
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (field === "name") return { ...p, name: value };
        const num = Math.max(0, Number(value.replace(/[^\d-]/g, "")) || 0);
        const updated = { ...p, [field]: num };
        updated.balance = updated.loot - updated.supplies;
        return updated;
      })
    );
  }

  const displayPlayers = useMemo(
    () => players.map((p) => ({ ...p, balance: p.loot - p.supplies })),
    [players]
  );

  const { fairShare, transactions } = useMemo(
    () => computeSettlements(displayPlayers),
    [displayPlayers]
  );

  function copyAll() {
    const text = transactions
      .map((t) => `${t.from} → transfer ${t.amount} to ${t.to}`)
      .join("\n");
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1500);
    });
  }

  const bg = darkMode ? "bg-[#131210] text-[#d8d2b8]" : "bg-neutral-50 text-neutral-800";
  const mutedText = darkMode ? "text-[#a89f82]" : "text-neutral-500";
  const subtleBorder = darkMode ? "border-black" : "border-neutral-200";
  const inputCls = darkMode
    ? "border-black/60 bg-[#1a1a17] text-[#e3ddc4] placeholder:text-[#75705c] focus:border-[#c9a227]"
    : "border-neutral-200 bg-white text-neutral-700 focus:border-rose-400";
  const btnGhost = darkMode
    ? "border-black/60 bg-[#333029] text-[#d8d2b8] hover:bg-[#3d3a30]"
    : "border-neutral-200 text-neutral-600 hover:bg-neutral-50";
  const btnPrimary = darkMode
    ? "bg-[#5a1f1f] text-[#f3e3c0] hover:bg-[#6d2626]"
    : "bg-rose-500 text-white hover:bg-rose-600";

  return (
    <div className={`min-h-screen transition-colors ${bg}`}>
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-3 py-4 sm:px-6 sm:py-8">
        <NavTabs dark={darkMode} />
        <header
          className={`mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-dashed pb-4 ${subtleBorder}`}
        >
          <div>
            <h1
              className={`text-xl font-bold uppercase tracking-widest sm:text-2xl ${
                darkMode ? "text-[#e3c168]" : "text-neutral-800"
              }`}
              style={darkMode ? { textShadow: "0 0 12px rgba(227,193,104,0.35)" } : undefined}
            >
              💰 Loot Splitter
            </h1>
            <p className={`text-sm ${mutedText}`}>
              Cole o Party Hunt Analyser e veja quem deve pagar quem
            </p>
          </div>
          <button
            onClick={() => setDarkMode((d) => !d)}
            className={`flex h-7 w-7 items-center justify-center rounded-[3px] border text-sm ${btnGhost}`}
            title="Alternar modo claro/escuro"
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
        </header>

        <div className="mb-4">
          <Panel title="Colar sessão (Party Hunt Analyser)" dark={darkMode}>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={
                "No jogo: Analytics Selector → Party Hunt Analyser → Copy to clipboard.\nCole aqui o texto (Session data / Loot / Supplies / Balance / Damage / Healing de cada jogador)."
              }
              rows={6}
              className={`w-full resize-y rounded-[3px] border px-2 py-1.5 font-mono text-xs focus:outline-none ${inputCls}`}
            />
            {parseError && (
              <p
                className={`mt-2 text-xs ${
                  darkMode ? "text-red-400" : "text-red-600"
                }`}
              >
                {parseError}
              </p>
            )}
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleParse}
                disabled={!rawText.trim()}
                className={`rounded-[3px] px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${btnPrimary}`}
              >
                Calcular
              </button>
              <button
                onClick={handleClear}
                className={`rounded-[3px] border px-3 py-1.5 text-xs ${btnGhost}`}
              >
                Limpar
              </button>
            </div>
          </Panel>
        </div>

        <div className="mb-4">
          <Panel
            title="Jogadores"
            dark={darkMode}
            right={
              <button
                onClick={addPlayer}
                className={`rounded-[2px] border px-2 py-0.5 text-[10px] font-semibold uppercase ${btnGhost}`}
              >
                + Adicionar
              </button>
            }
          >
            {displayPlayers.length === 0 ? (
              <p className={`text-xs ${mutedText}`}>
                Cole a sessão acima e clique em Calcular, ou adicione jogadores
                manualmente.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] border-collapse text-xs">
                  <thead>
                    <tr className={mutedText}>
                      <th className="px-1.5 py-1 text-left font-normal uppercase">Nome</th>
                      <th className="px-1.5 py-1 text-right font-normal uppercase">Loot</th>
                      <th className="px-1.5 py-1 text-right font-normal uppercase">
                        Supplies
                      </th>
                      <th className="px-1.5 py-1 text-right font-normal uppercase">
                        Balance
                      </th>
                      <th className="px-1.5 py-1" />
                    </tr>
                  </thead>
                  <tbody>
                    {displayPlayers.map((p) => (
                      <tr key={p.id} className={`border-t ${subtleBorder}`}>
                        <td className="px-1.5 py-1">
                          <input
                            value={p.name}
                            onChange={(e) => updatePlayer(p.id, "name", e.target.value)}
                            className={`w-28 rounded-[3px] border px-1.5 py-1 text-xs focus:outline-none ${inputCls}`}
                          />
                          {p.isLeader && (
                            <span className={`ml-1 text-[10px] ${mutedText}`}>(líder)</span>
                          )}
                        </td>
                        <td className="px-1.5 py-1">
                          <input
                            value={p.loot}
                            onChange={(e) => updatePlayer(p.id, "loot", e.target.value)}
                            inputMode="numeric"
                            className={`w-24 rounded-[3px] border px-1.5 py-1 text-right text-xs focus:outline-none ${inputCls}`}
                          />
                        </td>
                        <td className="px-1.5 py-1">
                          <input
                            value={p.supplies}
                            onChange={(e) => updatePlayer(p.id, "supplies", e.target.value)}
                            inputMode="numeric"
                            className={`w-24 rounded-[3px] border px-1.5 py-1 text-right text-xs focus:outline-none ${inputCls}`}
                          />
                        </td>
                        <td
                          className={`px-1.5 py-1 text-right font-mono font-semibold ${
                            p.balance < 0
                              ? "text-red-500"
                              : darkMode
                                ? "text-[#c9a227]"
                                : "text-emerald-600"
                          }`}
                        >
                          {fmt(p.balance)}
                        </td>
                        <td className="px-1.5 py-1 text-right">
                          <button
                            onClick={() => removePlayer(p.id)}
                            className={`rounded-[2px] border px-1.5 py-0.5 text-[10px] ${btnGhost}`}
                            title="Remover jogador"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        {displayPlayers.length >= 2 && (
          <Panel
            title="Resultado"
            dark={darkMode}
            right={
              transactions.length > 0 && (
                <button
                  onClick={copyAll}
                  className={`rounded-[2px] border px-2 py-0.5 text-[10px] font-semibold uppercase ${btnGhost}`}
                >
                  {copiedAll ? "Copiado!" : "Copiar tudo"}
                </button>
              )
            }
          >
            <p className={`mb-2 text-xs ${mutedText}`}>
              Lucro justo por pessoa:{" "}
              <span className="font-mono font-semibold text-[#c9a227]">
                {fmt(Math.round(fairShare))}
              </span>{" "}
              gold
            </p>
            {transactions.length === 0 ? (
              <p className="text-sm">✅ Tudo certo — ninguém deve nada a ninguém.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {transactions.map((t, i) => (
                  <li
                    key={i}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-[3px] border px-2 py-1.5 text-xs ${
                      darkMode ? "border-black/60 bg-[#1a1a17]" : "border-neutral-200 bg-neutral-50"
                    }`}
                  >
                    <span>
                      <strong>{t.from}</strong> paga{" "}
                      <span className="font-mono font-semibold text-[#c9a227]">
                        {fmt(t.amount)}
                      </span>{" "}
                      para <strong>{t.to}</strong>
                    </span>
                    <button
                      onClick={() =>
                        navigator.clipboard?.writeText(`transfer ${t.amount} to ${t.to}`)
                      }
                      className={`rounded-[2px] border px-1.5 py-0.5 text-[10px] ${btnGhost}`}
                      title="Copiar comando de transferência"
                    >
                      copiar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        <p className={`mt-6 text-xs ${mutedText}`}>
          Cole o texto do Party Hunt Analyser (Copy to clipboard, no jogo) e clique em
          Calcular — os campos ficam editáveis depois, e o resultado é recalculado na
          hora. O cálculo divide o lucro total (loot − supplies) igualmente entre todos
          e indica as transferências mínimas para acertar as contas. Referência:{" "}
          tibiamaps.io/tools/loot.
        </p>
      </div>
    </div>
  );
}
