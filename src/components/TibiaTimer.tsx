"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  VOCATIONS,
  VOCATION_ORDER,
  type VocationCode,
} from "@/lib/tibiaVocations";
import ItemIcon from "@/components/ItemIcon";
import Panel from "@/components/Panel";

const STORAGE_KEY = "tibia-timer-state-v4";
const WARN_MS = 30 * 1000;
const POTION_DURATION_MS = 10 * 60 * 1000;
const MAX_ADJUSTABLE_MS = 30 * 60 * 1000;
const FREE_MAX_MS = 180 * 60 * 1000;
const FREE_DEFAULT_MS = 5 * 60 * 1000;

type TimerId = "potion" | "amulet" | "ring" | "free";
type EditableTimerId = "amulet" | "ring" | "free";

interface TimerConfig {
  id: TimerId;
  label: string;
  /** true = duração ajustável manualmente */
  editableDuration: boolean;
  /** true = nome/objetivo editável (poção fica fixa por vocação) */
  editableName: boolean;
  /** teto da duração ajustável, em ms */
  maxMs?: number;
}

const TIMERS: TimerConfig[] = [
  { id: "potion", label: "Poção de Buff", editableDuration: false, editableName: false },
  {
    id: "amulet",
    label: "Amuleto",
    editableDuration: true,
    editableName: true,
    maxMs: MAX_ADJUSTABLE_MS,
  },
  {
    id: "ring",
    label: "Anel",
    editableDuration: true,
    editableName: true,
    maxMs: MAX_ADJUSTABLE_MS,
  },
  {
    id: "free",
    label: "Timer Livre",
    editableDuration: true,
    editableName: true,
    maxMs: FREE_MAX_MS,
  },
];

function clampDuration(ms: number, maxMs: number): number {
  return Math.min(maxMs, Math.max(0, Math.round(ms)));
}

interface TimerState {
  running: boolean;
  endsAt: number | null;
}

interface PersistedState {
  vocation: VocationCode;
  amuletLabel: string;
  ringLabel: string;
  freeLabel: string;
  amuletDurationMs: number;
  ringDurationMs: number;
  freeDurationMs: number;
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
  freeLabel: "",
  amuletDurationMs: MAX_ADJUSTABLE_MS,
  ringDurationMs: MAX_ADJUSTABLE_MS,
  freeDurationMs: FREE_DEFAULT_MS,
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
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
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
  const [freeLabel, setFreeLabel] = useState(DEFAULT_STATE.freeLabel);
  const [amuletDurationMs, setAmuletDurationMs] = useState(DEFAULT_STATE.amuletDurationMs);
  const [ringDurationMs, setRingDurationMs] = useState(DEFAULT_STATE.ringDurationMs);
  const [freeDurationMs, setFreeDurationMs] = useState(DEFAULT_STATE.freeDurationMs);
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
    free: { running: false, endsAt: null },
  });
  const [now, setNow] = useState(() => Date.now());
  const [hydrated, setHydrated] = useState(false);
  const warnedRef = useRef<Record<TimerId, boolean>>({
    potion: false,
    amulet: false,
    ring: false,
    free: false,
  });

  const hydrateFromClient = useCallback(() => {
    const persisted = loadPersisted();
    setVocation(persisted.vocation);
    setAmuletLabel(persisted.amuletLabel);
    setRingLabel(persisted.ringLabel);
    setFreeLabel(persisted.freeLabel);
    setAmuletDurationMs(persisted.amuletDurationMs);
    setRingDurationMs(persisted.ringDurationMs);
    setFreeDurationMs(persisted.freeDurationMs);
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
      freeLabel,
      amuletDurationMs,
      ringDurationMs,
      freeDurationMs,
      soundOn,
      voiceOn,
      darkMode,
      hotkeyCode,
      hotkeyLabel,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [
    vocation,
    amuletLabel,
    ringLabel,
    freeLabel,
    amuletDurationMs,
    ringDurationMs,
    freeDurationMs,
    soundOn,
    voiceOn,
    darkMode,
    hotkeyCode,
    hotkeyLabel,
    hydrated,
  ]);

  function durationFor(id: TimerId): number {
    if (id === "potion") return POTION_DURATION_MS;
    if (id === "amulet") return amuletDurationMs;
    if (id === "ring") return ringDurationMs;
    return freeDurationMs;
  }

  function setDuration(id: EditableTimerId, ms: number) {
    const maxMs = TIMERS.find((c) => c.id === id)!.maxMs!;
    const clamped = clampDuration(ms, maxMs);
    if (id === "amulet") setAmuletDurationMs(clamped);
    else if (id === "ring") setRingDurationMs(clamped);
    else setFreeDurationMs(clamped);
    // se já estiver rodando, aplica a nova duração imediatamente na contagem
    setTimers((prev) =>
      prev[id].running
        ? { ...prev, [id]: { running: true, endsAt: Date.now() + clamped } }
        : prev
    );
  }

  function labelFor(id: EditableTimerId): string {
    if (id === "amulet") return amuletLabel;
    if (id === "ring") return ringLabel;
    return freeLabel;
  }

  function setLabelFor(id: EditableTimerId, value: string) {
    if (id === "amulet") setAmuletLabel(value);
    else if (id === "ring") setRingLabel(value);
    else setFreeLabel(value);
  }

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
      if (id === "ring") return ringLabel.trim() || VOCATIONS[vocation].ring.name;
      return freeLabel.trim() || "timer livre";
    },
    [vocation, amuletLabel, ringLabel, freeLabel]
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
            next[cfg.id] = { running: true, endsAt: current + durationFor(cfg.id) };
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- durationFor lê amulet/ring/freeDurationMs, listados abaixo
  }, [itemName, notify, voiceOn, amuletDurationMs, ringDurationMs, freeDurationMs]);

  function requestNotifPermission() {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then(setNotifPermission);
  }

  function startTimer(id: TimerId) {
    warnedRef.current[id] = false;
    setTimers((prev) => ({
      ...prev,
      [id]: { running: true, endsAt: Date.now() + durationFor(id) },
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
          next[cfg.id] = { running: true, endsAt: current + durationFor(cfg.id) };
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- durationFor lê amulet/ring/freeDurationMs, listados abaixo
  }, [amuletDurationMs, ringDurationMs, freeDurationMs]);

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
  const btnToggleOn = "bg-emerald-700 text-white border-emerald-700";

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
              Poção a cada 10 min · Amuleto e anel a cada 30 min · timer livre à sua escolha
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

        {notifPermission !== "granted" && notifPermission !== "unsupported" && (
          <div
            className={`mb-4 flex items-center justify-between gap-3 rounded-[3px] border px-3 py-2 text-sm ${
              darkMode
                ? "border-[#7a5b1f] bg-[#241a0a] text-[#e3c168]"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            <span>Ative as notificações do navegador para receber os avisos.</span>
            <button
              onClick={requestNotifPermission}
              className={`shrink-0 rounded-[3px] px-3 py-1.5 font-semibold ${btnPrimary}`}
            >
              Ativar
            </button>
          </div>
        )}

        <div className="mb-4">
          <Panel title="Vocação" dark={darkMode}>
            <div className="flex flex-wrap gap-1.5">
              {VOCATION_ORDER.map((code) => {
                const v = VOCATIONS[code];
                const active = code === vocation;
                return (
                  <button
                    key={code}
                    onClick={() => handleVocationChange(code)}
                    className={`rounded-[3px] border px-2.5 py-1.5 text-xs font-medium transition ${
                      active
                        ? darkMode
                          ? "border-[#c9a227] bg-[#c9a227] text-[#1c140c]"
                          : "border-rose-500 bg-rose-500 text-white"
                        : btnGhost
                    }`}
                  >
                    {v.emoji} {code} — {v.name}
                  </button>
                );
              })}
            </div>
          </Panel>
        </div>

        <div className="mb-4">
          <Panel
            title="Configurações"
            dark={darkMode}
            right={
              <button
                onClick={toggleAll}
                className={`rounded-[2px] border px-2 py-0.5 text-[10px] font-semibold uppercase ${btnPrimary}`}
              >
                {anyRunning ? "Pausar tudo" : "Iniciar tudo"}
              </button>
            }
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs ${mutedText}`}>🔊 Som</span>
                <button
                  onClick={() => setSoundOn((s) => !s)}
                  className={`rounded-[2px] border px-2 py-0.5 text-[11px] font-semibold ${
                    soundOn ? btnToggleOn : btnGhost
                  }`}
                >
                  {soundOn ? "Ligado" : "Desligado"}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${mutedText}`}>🗣️ Narrador (30s)</span>
                <button
                  onClick={() => setVoiceOn((v) => !v)}
                  className={`rounded-[2px] border px-2 py-0.5 text-[11px] font-semibold ${
                    voiceOn ? btnToggleOn : btnGhost
                  }`}
                >
                  {voiceOn ? "Ligado" : "Desligado"}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${mutedText}`}>⌨️ Atalho iniciar/pausar tudo</span>
                <button
                  onClick={() => setListeningHotkey(true)}
                  className={`rounded-[2px] border px-2 py-0.5 text-[11px] font-semibold ${
                    listeningHotkey ? "animate-pulse border-amber-500 bg-amber-500 text-white" : btnGhost
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
                    className={`rounded-[2px] border px-1.5 py-0.5 text-[11px] ${btnGhost}`}
                    title="Remover atalho"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-3">
          {TIMERS.map((cfg) => {
            const t = timers[cfg.id];
            const duration = durationFor(cfg.id);
            const remaining = t.running && t.endsAt !== null ? t.endsAt - now : duration;
            const pct = duration > 0 ? Math.max(0, Math.min(1, remaining / duration)) : 0;
            const lowTime = t.running && remaining <= WARN_MS;
            const item = cfg.id === "free" ? null : vocationInfo[cfg.id];

            return (
              <Panel key={cfg.id} title={cfg.label} dark={darkMode} highlight={lowTime}>
                <div className="flex items-start gap-3">
                  {item ? (
                    <ItemIcon item={item} size={40} />
                  ) : (
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[3px] border text-lg ${
                        darkMode ? "border-black/60 bg-[#1a1a17]" : "border-neutral-200 bg-neutral-100"
                      }`}
                    >
                      🎯
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className={`text-[11px] ${mutedText}`}>duração {formatTime(duration)}</div>
                    {cfg.editableName ? (
                      <input
                        value={labelFor(cfg.id as EditableTimerId)}
                        onChange={(e) => setLabelFor(cfg.id as EditableTimerId, e.target.value)}
                        placeholder={
                          cfg.id === "free" ? "Objetivo (ex: refill de mana, backpack…)" : undefined
                        }
                        className={`mt-0.5 w-full rounded-[3px] border px-2 py-1.5 text-sm focus:outline-none ${inputCls}`}
                      />
                    ) : (
                      <p className="mt-0.5 text-sm font-medium">{item?.name}</p>
                    )}
                  </div>
                </div>

                {cfg.editableDuration && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] uppercase ${mutedText}`}>
                      ⏳ 00:00–{formatTime(cfg.maxMs!)}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={cfg.maxMs! / 1000}
                      step={15}
                      value={Math.round(duration / 1000)}
                      onChange={(e) =>
                        setDuration(cfg.id as EditableTimerId, Number(e.target.value) * 1000)
                      }
                      className="h-1.5 min-w-[100px] flex-1 accent-[#c9a227]"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={Math.floor(cfg.maxMs! / 60000)}
                        value={Math.floor(duration / 60000)}
                        onChange={(e) => {
                          const min = Number(e.target.value) || 0;
                          const sec = Math.floor((duration % 60000) / 1000);
                          setDuration(cfg.id as EditableTimerId, min * 60000 + sec * 1000);
                        }}
                        className={`w-12 rounded-[3px] border px-1.5 py-1 text-center text-xs focus:outline-none ${inputCls}`}
                        aria-label="Minutos"
                      />
                      <span className={`text-[10px] ${mutedText}`}>min</span>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={Math.floor((duration % 60000) / 1000)}
                        onChange={(e) => {
                          const sec = Number(e.target.value) || 0;
                          const min = Math.floor(duration / 60000);
                          setDuration(cfg.id as EditableTimerId, min * 60000 + sec * 1000);
                        }}
                        className={`w-12 rounded-[3px] border px-1.5 py-1 text-center text-xs focus:outline-none ${inputCls}`}
                        aria-label="Segundos"
                      />
                      <span className={`text-[10px] ${mutedText}`}>seg</span>
                    </div>
                  </div>
                )}

                <div
                  className={`relative mt-2 h-6 w-full overflow-hidden rounded-[2px] border ${
                    darkMode ? "border-black/60 bg-black/50" : "border-neutral-200 bg-neutral-100"
                  }`}
                >
                  <div
                    className={`h-full transition-all ${
                      lowTime ? "bg-red-600" : t.running ? "bg-[#c9a227]" : "bg-neutral-500/60"
                    }`}
                    style={{ width: `${pct * 100}%` }}
                  />
                  <span
                    className={`absolute inset-0 flex items-center justify-center font-mono text-xs font-bold ${
                      darkMode ? "text-[#f3edd8]" : "text-neutral-800"
                    }`}
                    style={darkMode ? { textShadow: "0 1px 2px rgba(0,0,0,0.8)" } : undefined}
                  >
                    {formatTime(remaining)}
                  </span>
                </div>

                <div className="mt-2 flex justify-end gap-1.5">
                  {t.running ? (
                    <>
                      <button
                        onClick={() => pauseTimer(cfg.id)}
                        className={`rounded-[3px] border px-2.5 py-1 text-xs ${btnGhost}`}
                      >
                        Pausar
                      </button>
                      <button
                        onClick={() => resetTimer(cfg.id)}
                        className={`rounded-[3px] border px-2.5 py-1 text-xs ${btnGhost}`}
                      >
                        Reiniciar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => startTimer(cfg.id)}
                      className={`rounded-[3px] px-2.5 py-1 text-xs font-semibold ${btnPrimary}`}
                    >
                      Iniciar
                    </button>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>

        <p className={`mt-6 text-xs ${mutedText}`}>
          Ao zerar, cada cronômetro avisa (som + narração + notificação) e reinicia
          sozinho, repetindo automaticamente até você pausar. Poção fixa em 10 min por
          vocação; amuleto e anel já vêm com o item correto (Plasma) e sua duração pode
          ser ajustada manualmente. O Timer Livre, no fim da lista, é 100% livre — dê um
          nome e o tempo que quiser. Referência: tibiawiki.com.br / tibia.fandom.com.
        </p>
      </div>
    </div>
  );
}
