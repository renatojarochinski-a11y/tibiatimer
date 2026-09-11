"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  VOCATIONS,
  VOCATION_ORDER,
  type VocationCode,
} from "@/lib/tibiaVocations";
import ItemIcon from "@/components/ItemIcon";

const STORAGE_KEY = "tibia-timer-state-v2";
const WARN_MS = 30 * 1000;

type TimerId = "potion" | "amulet" | "ring";

interface TimerConfig {
  id: TimerId;
  label: string;
  durationMs: number;
  editable: boolean;
}

const TIMERS: TimerConfig[] = [
  { id: "potion", label: "Poção de buff", durationMs: 10 * 60 * 1000, editable: false },
  { id: "amulet", label: "Amuleto", durationMs: 30 * 60 * 1000, editable: true },
  { id: "ring", label: "Anel", durationMs: 30 * 60 * 1000, editable: true },
];

interface TimerState {
  running: boolean;
  endsAt: number | null;
}

interface PersistedState {
  vocation: VocationCode;
  amuletLabel: string;
  ringLabel: string;
  soundOn: boolean;
  voiceOn: boolean;
  darkMode: boolean;
  hotkeyCode: string | null;
  hotkeyLabel: string | null;
}

const DEFAULT_STATE: PersistedState = {
  vocation: "EK",
  amuletLabel: VOCATIONS.EK.amulet.name,
  ringLabel: VOCATIONS.EK.ring.name,
  soundOn: true,
  voiceOn: true,
  darkMode: true,
  hotkeyCode: null,
  hotkeyLabel: null,
};

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

function speak(text: string) {
  try {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  } catch {
    // navegador sem suporte a fala — ignora
  }
}

function friendlyKeyLabel(e: KeyboardEvent): string {
  if (e.code === "Space") return "Espaço";
  if (e.code.startsWith("Key")) return e.code.slice(3);
  if (e.code.startsWith("Digit")) return e.code.slice(5);
  return e.key.length === 1 ? e.key.toUpperCase() : e.code;
}

export default function TibiaTimer() {
  const [vocation, setVocation] = useState<VocationCode>(DEFAULT_STATE.vocation);
  const [amuletLabel, setAmuletLabel] = useState(DEFAULT_STATE.amuletLabel);
  const [ringLabel, setRingLabel] = useState(DEFAULT_STATE.ringLabel);
  const [soundOn, setSoundOn] = useState(DEFAULT_STATE.soundOn);
  const [voiceOn, setVoiceOn] = useState(DEFAULT_STATE.voiceOn);
  const [darkMode, setDarkMode] = useState(DEFAULT_STATE.darkMode);
  const [hotkeyCode, setHotkeyCode] = useState<string | null>(DEFAULT_STATE.hotkeyCode);
  const [hotkeyLabel, setHotkeyLabel] = useState<string | null>(DEFAULT_STATE.hotkeyLabel);
  const [listeningHotkey, setListeningHotkey] = useState(false);
  const [notifPermission, setNotifPermission] =
    useState<NotificationPermission | "unsupported">("default");
  const [timers, setTimers] = useState<Record<TimerId, TimerState>>({
    potion: { running: false, endsAt: null },
    amulet: { running: false, endsAt: null },
    ring: { running: false, endsAt: null },
  });
  const [now, setNow] = useState(() => Date.now());
  const [hydrated, setHydrated] = useState(false);
  const warnedRef = useRef<Record<TimerId, boolean>>({
    potion: false,
    amulet: false,
    ring: false,
  });

  const hydrateFromClient = useCallback(() => {
    const persisted = loadPersisted();
    setVocation(persisted.vocation);
    setAmuletLabel(persisted.amuletLabel);
    setRingLabel(persisted.ringLabel);
    setSoundOn(persisted.soundOn);
    setVoiceOn(persisted.voiceOn);
    setDarkMode(persisted.darkMode);
    setHotkeyCode(persisted.hotkeyCode);
    setHotkeyLabel(persisted.hotkeyLabel);
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
    const data: PersistedState = {
      vocation,
      amuletLabel,
      ringLabel,
      soundOn,
      voiceOn,
      darkMode,
      hotkeyCode,
      hotkeyLabel,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [vocation, amuletLabel, ringLabel, soundOn, voiceOn, darkMode, hotkeyCode, hotkeyLabel, hydrated]);

  // ao trocar de vocação, os rótulos de amuleto/anel voltam para o item correto daquela vocação
  function handleVocationChange(code: VocationCode) {
    setVocation(code);
    setAmuletLabel(VOCATIONS[code].amulet.name);
    setRingLabel(VOCATIONS[code].ring.name);
  }

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

  const itemName = useCallback(
    (id: TimerId): string => {
      if (id === "potion") return VOCATIONS[vocation].potion.name;
      if (id === "amulet") return amuletLabel.trim() || VOCATIONS[vocation].amulet.name;
      return ringLabel.trim() || VOCATIONS[vocation].ring.name;
    },
    [vocation, amuletLabel, ringLabel]
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
          if (!t.running || t.endsAt === null) continue;
          const remaining = t.endsAt - current;

          if (remaining <= 0) {
            changed = true;
            notify(`⏰ Tibia — ${cfg.label}`, `Hora de usar: ${itemName(cfg.id)}`);
            next[cfg.id] = { running: true, endsAt: current + cfg.durationMs };
            warnedRef.current[cfg.id] = false;
            continue;
          }

          if (voiceOn && remaining <= WARN_MS && !warnedRef.current[cfg.id]) {
            warnedRef.current[cfg.id] = true;
            speak(`Está acabando ${itemName(cfg.id)} em 30 segundos`);
          }
        }
        return changed ? next : prev;
      });
    }, 250);
    return () => clearInterval(interval);
  }, [itemName, notify, voiceOn]);

  function requestNotifPermission() {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then(setNotifPermission);
  }

  function startTimer(id: TimerId) {
    const cfg = TIMERS.find((t) => t.id === id)!;
    warnedRef.current[id] = false;
    setTimers((prev) => ({
      ...prev,
      [id]: { running: true, endsAt: Date.now() + cfg.durationMs },
    }));
  }

  function pauseTimer(id: TimerId) {
    setTimers((prev) => ({ ...prev, [id]: { running: false, endsAt: null } }));
  }

  function resetTimer(id: TimerId) {
    startTimer(id);
  }

  const toggleAll = useCallback(() => {
    setTimers((prev) => {
      const anyRunning = TIMERS.some((cfg) => prev[cfg.id].running);
      const next: Record<TimerId, TimerState> = { ...prev };
      const current = Date.now();
      for (const cfg of TIMERS) {
        if (anyRunning) {
          next[cfg.id] = { running: false, endsAt: null };
        } else {
          warnedRef.current[cfg.id] = false;
          next[cfg.id] = { running: true, endsAt: current + cfg.durationMs };
        }
      }
      return next;
    });
  }, []);

  // captura da tecla de atalho
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (listeningHotkey) {
        e.preventDefault();
        setHotkeyCode(e.code);
        setHotkeyLabel(friendlyKeyLabel(e));
        setListeningHotkey(false);
        return;
      }

      if (isTyping || !hotkeyCode) return;

      if (e.code === hotkeyCode) {
        e.preventDefault();
        toggleAll();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [listeningHotkey, hotkeyCode, toggleAll]);

  const vocationInfo = VOCATIONS[vocation];
  const anyRunning = TIMERS.some((cfg) => timers[cfg.id].running);

  const bg = darkMode
    ? "bg-[#0f0a06] text-[#ecdcb4]"
    : "bg-neutral-50 text-neutral-800";
  const cardBg = darkMode
    ? "border-[#4a3520] bg-[#1c140c] shadow-[inset_0_0_0_1px_rgba(201,162,39,0.15)]"
    : "border-neutral-200 bg-white shadow-sm";
  const mutedText = darkMode ? "text-[#b39a6b]" : "text-neutral-500";
  const subtleBorder = darkMode ? "border-[#4a3520]" : "border-neutral-200";
  const inputCls = darkMode
    ? "border-[#4a3520] bg-[#120c07] text-[#ecdcb4] placeholder:text-[#7a6746] focus:border-[#c9a227]"
    : "border-neutral-200 bg-white text-neutral-700 focus:border-rose-400";
  const btnGhost = darkMode
    ? "border-[#4a3520] text-[#d9c290] hover:bg-[#2a1e10]"
    : "border-neutral-200 text-neutral-600 hover:bg-neutral-50";
  const btnPrimary = darkMode
    ? "bg-[#7a1f1f] text-[#f3e3c0] hover:bg-[#8f2626]"
    : "bg-rose-500 text-white hover:bg-rose-600";

  return (
    <div className={`min-h-screen transition-colors ${bg}`}>
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-3 py-4 sm:px-6 sm:py-8">
        <header className={`mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-dashed pb-4 ${subtleBorder}`}>
          <div>
            <h1
              className={`text-xl font-bold uppercase tracking-widest sm:text-2xl ${
                darkMode ? "text-[#e3c168]" : "text-neutral-800"
              }`}
              style={darkMode ? { textShadow: "0 0 12px rgba(227,193,104,0.35)" } : undefined}
            >
              ⚔️ Tibia Timer
            </h1>
            <p className={`text-sm ${mutedText}`}>
              Poção a cada 10 min · Amuleto e anel a cada 30 min
            </p>
          </div>
          <button
            onClick={() => setDarkMode((d) => !d)}
            className={`rounded-lg border px-3 py-2 text-sm ${btnGhost}`}
            title="Alternar modo claro/escuro"
          >
            {darkMode ? "☀️ Claro" : "🌙 Escuro"}
          </button>
        </header>

        {notifPermission !== "granted" && notifPermission !== "unsupported" && (
          <div
            className={`mb-4 flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${
              darkMode
                ? "border-[#7a5b1f] bg-[#241a0a] text-[#e3c168]"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            <span>Ative as notificações do navegador para receber os avisos.</span>
            <button
              onClick={requestNotifPermission}
              className={`shrink-0 rounded-lg px-3 py-1.5 font-semibold ${btnPrimary}`}
            >
              Ativar
            </button>
          </div>
        )}

        <section className="mb-5">
          <h2 className={`mb-2 text-sm font-semibold uppercase tracking-wide ${mutedText}`}>
            Vocação
          </h2>
          <div className="flex flex-wrap gap-2">
            {VOCATION_ORDER.map((code) => {
              const v = VOCATIONS[code];
              const active = code === vocation;
              return (
                <button
                  key={code}
                  onClick={() => handleVocationChange(code)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    active
                      ? darkMode
                        ? "border-[#c9a227] bg-[#c9a227] text-[#1c140c]"
                        : "border-rose-500 bg-rose-500 text-white"
                      : `${btnGhost} bg-transparent`
                  }`}
                >
                  {v.emoji} {code} — {v.name}
                </button>
              );
            })}
          </div>
        </section>

        <section className={`mb-5 flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2 ${cardBg}`}>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${mutedText}`}>🔊 Som</span>
            <button
              onClick={() => setSoundOn((s) => !s)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                soundOn ? "bg-emerald-600 text-white" : `${btnGhost}`
              }`}
            >
              {soundOn ? "Ligado" : "Desligado"}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${mutedText}`}>🗣️ Narrador (30s)</span>
            <button
              onClick={() => setVoiceOn((v) => !v)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                voiceOn ? "bg-emerald-600 text-white" : `${btnGhost}`
              }`}
            >
              {voiceOn ? "Ligado" : "Desligado"}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${mutedText}`}>⌨️ Atalho iniciar/pausar tudo</span>
            <button
              onClick={() => setListeningHotkey(true)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                listeningHotkey ? "animate-pulse bg-amber-500 text-white" : btnGhost
              }`}
            >
              {listeningHotkey ? "Pressione uma tecla…" : hotkeyLabel ? hotkeyLabel : "Definir"}
            </button>
            {hotkeyLabel && !listeningHotkey && (
              <button
                onClick={() => {
                  setHotkeyCode(null);
                  setHotkeyLabel(null);
                }}
                className={`rounded-lg px-2 py-1 text-xs ${btnGhost}`}
                title="Remover atalho"
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={toggleAll}
            className={`ml-auto rounded-lg px-3 py-1.5 text-sm font-semibold ${btnPrimary}`}
          >
            {anyRunning ? "Pausar tudo" : "Iniciar tudo"}
          </button>
        </section>

        <div className="flex flex-col gap-4">
          {TIMERS.map((cfg) => {
            const t = timers[cfg.id];
            const remaining =
              t.running && t.endsAt !== null ? t.endsAt - now : cfg.durationMs;
            const pct = t.running ? Math.max(0, Math.min(1, remaining / cfg.durationMs)) : 1;
            const lowTime = t.running && remaining <= WARN_MS;
            const item = vocationInfo[cfg.id];

            return (
              <div
                key={cfg.id}
                className={`flex flex-col gap-3 rounded-xl border p-4 ${cardBg} ${
                  lowTime ? "ring-2 ring-red-500/70" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <ItemIcon item={item} size={44} />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold">
                      {cfg.label}{" "}
                      <span className={`font-normal ${mutedText}`}>
                        ({cfg.durationMs / 60000} min)
                      </span>
                    </h3>
                    {cfg.editable ? (
                      <input
                        value={cfg.id === "amulet" ? amuletLabel : ringLabel}
                        onChange={(e) =>
                          cfg.id === "amulet"
                            ? setAmuletLabel(e.target.value)
                            : setRingLabel(e.target.value)
                        }
                        className={`mt-1 w-full rounded-lg border px-2 py-1.5 text-sm focus:outline-none ${inputCls}`}
                      />
                    ) : (
                      <p className="mt-1 text-sm font-medium">{item.name}</p>
                    )}
                    {cfg.id === "potion" && vocationInfo.potionNote && (
                      <p className={`mt-1 text-xs ${mutedText}`}>{vocationInfo.potionNote}</p>
                    )}
                  </div>
                </div>

                <div
                  className={`relative h-2 w-full overflow-hidden rounded-full ${
                    darkMode ? "bg-black/40" : "bg-neutral-100"
                  }`}
                >
                  <div
                    className={`h-full rounded-full transition-all ${
                      lowTime ? "bg-red-500" : t.running ? "bg-[#c9a227]" : "bg-neutral-400"
                    }`}
                    style={{ width: `${pct * 100}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-mono text-2xl font-bold">{formatTime(remaining)}</span>
                  <div className="flex gap-2">
                    {t.running ? (
                      <>
                        <button
                          onClick={() => pauseTimer(cfg.id)}
                          className={`rounded-lg border px-3 py-1.5 text-sm ${btnGhost}`}
                        >
                          Pausar
                        </button>
                        <button
                          onClick={() => resetTimer(cfg.id)}
                          className={`rounded-lg border px-3 py-1.5 text-sm ${btnGhost}`}
                        >
                          Reiniciar
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startTimer(cfg.id)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${btnPrimary}`}
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

        <p className={`mt-6 text-xs ${mutedText}`}>
          Ao zerar, cada cronômetro avisa (som + narração + notificação) e reinicia
          sozinho, repetindo automaticamente até você pausar. Poção fixa por vocação;
          amuleto e anel já vêm com o item correto (Plasma) e podem ser renomeados.
          Referência: tibiawiki.com.br / tibia.fandom.com.
        </p>
      </div>
    </div>
  );
}
