"use client";

import { useCallback, useEffect, useState } from "react";
import {
  VOCATIONS,
  VOCATION_ORDER,
  type VocationCode,
} from "@/lib/tibiaVocations";

const STORAGE_KEY = "tibia-timer-state-v1";

type TimerId = "potion" | "ring";

interface TimerConfig {
  id: TimerId;
  label: string;
  durationMs: number;
}

const TIMERS: TimerConfig[] = [
  { id: "potion", label: "Poções", durationMs: 10 * 60 * 1000 },
  { id: "ring", label: "Anéis / Amuletos", durationMs: 30 * 60 * 1000 },
];

interface TimerState {
  running: boolean;
  endsAt: number | null;
}

interface PersistedState {
  vocation: VocationCode;
  itemLabels: Record<TimerId, string>;
  soundOn: boolean;
}

function loadPersisted(): PersistedState {
  if (typeof window === "undefined") {
    return {
      vocation: "EK",
      itemLabels: { potion: "", ring: "" },
      soundOn: true,
    };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PersistedState;
  } catch {
    // ignora estado corrompido
  }
  return { vocation: "EK", itemLabels: { potion: "", ring: "" }, soundOn: true };
}

function formatTime(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function playBeep() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [0, 0.22, 0.44].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.3, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.2);
    });
    setTimeout(() => ctx.close(), 900);
  } catch {
    // navegador sem suporte a Web Audio — ignora
  }
}

export default function TibiaTimer() {
  const [vocation, setVocation] = useState<VocationCode>("EK");
  const [itemLabels, setItemLabels] = useState<Record<TimerId, string>>({
    potion: "",
    ring: "",
  });
  const [soundOn, setSoundOn] = useState(true);
  const [notifPermission, setNotifPermission] =
    useState<NotificationPermission | "unsupported">("default");
  const [timers, setTimers] = useState<Record<TimerId, TimerState>>({
    potion: { running: false, endsAt: null },
    ring: { running: false, endsAt: null },
  });
  const [now, setNow] = useState(() => Date.now());
  const [hydrated, setHydrated] = useState(false);

  const hydrateFromClient = useCallback(() => {
    const persisted = loadPersisted();
    setVocation(persisted.vocation);
    setItemLabels(persisted.itemLabels);
    setSoundOn(persisted.soundOn);
    setNotifPermission(
      typeof Notification === "undefined" ? "unsupported" : Notification.permission
    );
    setHydrated(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hidrata do localStorage, que só existe no cliente
    hydrateFromClient();
  }, [hydrateFromClient]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ vocation, itemLabels, soundOn })
    );
  }, [vocation, itemLabels, soundOn, hydrated]);

  const notify = useCallback(
    (title: string, body: string) => {
      if (soundOn) playBeep();
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          new Notification(title, { body, tag: title });
        } catch {
          // ignora falha ao criar notificação
        }
      }
    },
    [soundOn]
  );

  // laço principal: verifica os cronômetros a cada 250ms
  useEffect(() => {
    const interval = setInterval(() => {
      const current = Date.now();
      setNow(current);
      setTimers((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const cfg of TIMERS) {
          const t = prev[cfg.id];
          if (t.running && t.endsAt !== null && current >= t.endsAt) {
            changed = true;
            const label = itemLabels[cfg.id]?.trim();
            notify(
              `⏰ Tibia — ${cfg.label}`,
              label ? `Hora de usar: ${label}` : `Cronômetro de ${cfg.label.toLowerCase()} zerou!`
            );
            next[cfg.id] = { running: true, endsAt: current + cfg.durationMs };
          }
        }
        return changed ? next : prev;
      });
    }, 250);
    return () => clearInterval(interval);
  }, [itemLabels, notify]);

  function requestNotifPermission() {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then(setNotifPermission);
  }

  function startTimer(id: TimerId) {
    const cfg = TIMERS.find((t) => t.id === id)!;
    setTimers((prev) => ({
      ...prev,
      [id]: { running: true, endsAt: Date.now() + cfg.durationMs },
    }));
  }

  function pauseTimer(id: TimerId) {
    setTimers((prev) => ({ ...prev, [id]: { running: false, endsAt: null } }));
  }

  function resetTimer(id: TimerId) {
    const cfg = TIMERS.find((t) => t.id === id)!;
    setTimers((prev) => ({
      ...prev,
      [id]: { running: true, endsAt: Date.now() + cfg.durationMs },
    }));
  }

  const vocationInfo = VOCATIONS[vocation];
  const defaultLabels: Record<TimerId, string> = {
    potion: vocationInfo.potion,
    ring: vocationInfo.ringAmulet,
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-3 py-4 sm:px-6 sm:py-8">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-neutral-800 sm:text-xl">
            ⏱️ Cronômetro Tibia
          </h1>
          <p className="text-sm text-neutral-500">
            Poções a cada 10 min · Anéis/amuletos a cada 30 min
          </p>
        </div>
      </header>

      {notifPermission !== "granted" && notifPermission !== "unsupported" && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <span>Ative as notificações do navegador para receber os avisos.</span>
          <button
            onClick={requestNotifPermission}
            className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 font-semibold text-white hover:bg-amber-600"
          >
            Ativar
          </button>
        </div>
      )}

      <section className="mb-5">
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">Vocação</h2>
        <div className="flex flex-wrap gap-2">
          {VOCATION_ORDER.map((code) => {
            const v = VOCATIONS[code];
            const active = code === vocation;
            return (
              <button
                key={code}
                onClick={() => setVocation(code)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "border-rose-500 bg-rose-500 text-white"
                    : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {v.emoji} {code} — {v.name}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-5 flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2">
        <span className="text-sm text-neutral-600">🔊 Som ao alertar</span>
        <button
          onClick={() => setSoundOn((s) => !s)}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
            soundOn
              ? "bg-emerald-500 text-white hover:bg-emerald-600"
              : "bg-neutral-200 text-neutral-600 hover:bg-neutral-300"
          }`}
        >
          {soundOn ? "Ligado" : "Desligado"}
        </button>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {TIMERS.map((cfg) => {
          const t = timers[cfg.id];
          const remaining = t.running && t.endsAt !== null ? t.endsAt - now : cfg.durationMs;
          const pct = t.running ? Math.max(0, Math.min(1, remaining / cfg.durationMs)) : 1;
          return (
            <div
              key={cfg.id}
              className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
            >
              <div>
                <h3 className="text-sm font-semibold text-neutral-800">
                  {cfg.label}{" "}
                  <span className="font-normal text-neutral-400">
                    ({cfg.durationMs / 60000} min)
                  </span>
                </h3>
                <input
                  value={itemLabels[cfg.id] || ""}
                  onChange={(e) =>
                    setItemLabels((prev) => ({ ...prev, [cfg.id]: e.target.value }))
                  }
                  placeholder={defaultLabels[cfg.id]}
                  className="mt-1 w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-sm text-neutral-700 focus:border-rose-400 focus:outline-none"
                />
                {cfg.id === "potion" && vocationInfo.potionNote && (
                  <p className="mt-1 text-xs text-neutral-400">{vocationInfo.potionNote}</p>
                )}
              </div>

              <div className="relative h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                <div
                  className={`h-full rounded-full transition-all ${
                    t.running ? "bg-rose-500" : "bg-neutral-300"
                  }`}
                  style={{ width: `${pct * 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="font-mono text-2xl font-bold text-neutral-800">
                  {formatTime(remaining)}
                </span>
                <div className="flex gap-2">
                  {t.running ? (
                    <>
                      <button
                        onClick={() => pauseTimer(cfg.id)}
                        className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
                      >
                        Pausar
                      </button>
                      <button
                        onClick={() => resetTimer(cfg.id)}
                        className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
                      >
                        Reiniciar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => startTimer(cfg.id)}
                      className="rounded-lg bg-rose-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-600"
                    >
                      Iniciar
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-neutral-400">
        Ao zerar, cada cronômetro avisa (som + notificação) e reinicia sozinho,
        repetindo automaticamente até você pausar. Os nomes dos itens acima são
        sugestões editáveis — ajuste para o que você realmente usa em jogo.
        Referência: tibiawiki.com.br.
      </p>
    </div>
  );
}
