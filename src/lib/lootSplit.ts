export interface Player {
  id: string;
  name: string;
  isLeader: boolean;
  loot: number;
  supplies: number;
  balance: number;
  damage: number;
  healing: number;
}

export interface Transaction {
  from: string;
  to: string;
  amount: number;
}

const META_PREFIXES = [
  "session data:",
  "session:",
  "loot type:",
  "loot:",
  "supplies:",
  "balance:",
];

function parseNumber(raw: string): number {
  const cleaned = raw.replace(/[.,\s]/g, "");
  const value = parseInt(cleaned, 10);
  return Number.isFinite(value) ? value : 0;
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `p${idCounter}-${Date.now().toString(36)}`;
}

/**
 * Interpreta o texto copiado do Party Hunt Analyser do Tibia ("Copy to
 * clipboard"). Cada jogador aparece como um bloco "Nome" seguido de
 * "Loot:", "Supplies:", "Balance:", "Damage:" e "Healing:" — só esse
 * bloco tem Damage/Healing, o que permite distinguir cada jogador do
 * total geral da sessão (que tem só Loot/Supplies/Balance).
 */
export function parsePartyHuntText(raw: string): Player[] {
  const text = raw.replace(/\r/g, "");
  const blockRegex =
    /Loot:\s*(-?[\d.,]+)\s*Supplies:\s*(-?[\d.,]+)\s*Balance:\s*(-?[\d.,]+)\s*Damage:\s*(-?[\d.,]+)\s*Healing:\s*(-?[\d.,]+)/gi;

  const matches = [...text.matchAll(blockRegex)];
  const players: Player[] = [];

  matches.forEach((m, i) => {
    const prevEnd = i === 0 ? 0 : matches[i - 1].index! + matches[i - 1][0].length;
    const chunk = text.slice(prevEnd, m.index);
    const lines = chunk
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .filter((l) => !META_PREFIXES.some((p) => l.toLowerCase().startsWith(p)));

    const rawName = lines.length ? lines[lines.length - 1] : `Jogador ${i + 1}`;
    const isLeader = /\(leader\)/i.test(rawName);
    const name = rawName.replace(/\(leader\)/i, "").trim() || `Jogador ${i + 1}`;

    players.push({
      id: nextId(),
      name,
      isLeader,
      loot: parseNumber(m[1]),
      supplies: parseNumber(m[2]),
      balance: parseNumber(m[3]),
      damage: parseNumber(m[4]),
      healing: parseNumber(m[5]),
    });
  });

  return players;
}

export function emptyPlayer(name = "Jogador"): Player {
  return {
    id: nextId(),
    name,
    isLeader: false,
    loot: 0,
    supplies: 0,
    balance: 0,
    damage: 0,
    healing: 0,
  };
}

export interface SettleResult {
  total: number;
  fairShare: number;
  transactions: Transaction[];
}

/**
 * Calcula quem deve pagar/receber de quem para que todos fiquem com o
 * mesmo lucro líquido (balance), minimizando o número de transferências
 * — mesma lógica de "settle up" usada por calculadoras de divisão de loot.
 */
export function computeSettlements(players: Player[]): SettleResult {
  if (players.length === 0) return { total: 0, fairShare: 0, transactions: [] };

  const total = players.reduce((sum, p) => sum + p.balance, 0);
  const fairShare = total / players.length;

  const debtors = players
    .map((p) => ({ name: p.name, diff: Math.round(p.balance - fairShare) }))
    .filter((p) => p.diff > 0)
    .sort((a, b) => b.diff - a.diff);
  const creditors = players
    .map((p) => ({ name: p.name, diff: Math.round(fairShare - p.balance) }))
    .filter((p) => p.diff > 0)
    .sort((a, b) => b.diff - a.diff);

  const transactions: Transaction[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].diff, creditors[j].diff);
    if (amount >= 1) {
      transactions.push({ from: debtors[i].name, to: creditors[j].name, amount });
    }
    debtors[i].diff -= amount;
    creditors[j].diff -= amount;
    if (debtors[i].diff <= 0) i += 1;
    if (creditors[j].diff <= 0) j += 1;
  }

  return { total, fairShare, transactions };
}
