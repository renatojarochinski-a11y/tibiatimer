export type VocationCode = "EK" | "ED" | "MS" | "RP" | "MK";

export interface VocationInfo {
  code: VocationCode;
  name: string;
  emoji: string;
  /** Poção de buff de combate (10 em 10 minutos), conforme tibiawiki.com.br */
  potion: string;
  potionNote?: string;
  /** Anel/amuleto sugerido para o lembrete de 30 minutos — edite se usar outro. */
  ringAmulet: string;
}

export const VOCATIONS: Record<VocationCode, VocationInfo> = {
  EK: {
    code: "EK",
    name: "Elite Knight",
    emoji: "🛡️",
    potion: "Berserk Potion",
    ringAmulet: "Might Ring + Stone Skin Amulet",
  },
  RP: {
    code: "RP",
    name: "Royal Paladin",
    emoji: "🏹",
    potion: "Bullseye Potion",
    ringAmulet: "Prismatic Ring + Stone Skin Amulet",
  },
  ED: {
    code: "ED",
    name: "Elder Druid",
    emoji: "🌿",
    potion: "Mastermind Potion",
    ringAmulet: "Ring of Healing + Stone Skin Amulet",
  },
  MS: {
    code: "MS",
    name: "Master Sorcerer",
    emoji: "🔥",
    potion: "Mastermind Potion",
    ringAmulet: "Prismatic Ring + Stone Skin Amulet",
  },
  MK: {
    code: "MK",
    name: "Monk",
    emoji: "🥋",
    potion: "Great/Ultimate Spirit Potion",
    potionNote:
      "Monk não tem poção de buff de combate exclusiva (como Berserk/Bullseye/Mastermind). Ajuste para a poção que você usa.",
    ringAmulet: "Prismatic Ring + Stone Skin Amulet",
  },
};

export const VOCATION_ORDER: VocationCode[] = ["EK", "ED", "MS", "RP", "MK"];
