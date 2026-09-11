export type VocationCode = "EK" | "ED" | "MS" | "RP" | "MK";

export interface ItemInfo {
  name: string;
  /** Imagem hotlinkada do TibiaWiki (Special:FilePath aponta sempre pro arquivo mais atual). */
  image: string;
  /** Cor de referência do item (usada no fallback caso a imagem não carregue). */
  color: string;
}

export interface VocationInfo {
  code: VocationCode;
  name: string;
  emoji: string;
  /** Poção de buff de combate, fixa por vocação — 10 minutos. */
  potion: ItemInfo;
  potionNote?: string;
  /** Collar of [Color] Plasma — fixo por vocação, 30 minutos. */
  amulet: ItemInfo;
  /** Ring of [Color] Plasma — fixo por vocação, 30 minutos. */
  ring: ItemInfo;
}

const wikiImg = (file: string) =>
  `https://tibia.fandom.com/wiki/Special:FilePath/${file}`;

export const VOCATIONS: Record<VocationCode, VocationInfo> = {
  EK: {
    code: "EK",
    name: "Elite Knight",
    emoji: "🛡️",
    potion: {
      name: "Berserk Potion",
      image: wikiImg("Berserk_Potion.gif"),
      color: "#b23a2f",
    },
    amulet: {
      name: "Collar of Red Plasma",
      image: wikiImg("Collar_of_Red_Plasma.gif"),
      color: "#c0392b",
    },
    ring: {
      name: "Ring of Red Plasma",
      image: wikiImg("Ring_of_Red_Plasma.gif"),
      color: "#c0392b",
    },
  },
  RP: {
    code: "RP",
    name: "Royal Paladin",
    emoji: "🏹",
    potion: {
      name: "Bullseye Potion",
      image: wikiImg("Bullseye_Potion.gif"),
      color: "#c98a2b",
    },
    amulet: {
      name: "Collar of Blue Plasma",
      image: wikiImg("Collar_of_Blue_Plasma.gif"),
      color: "#2f6fb2",
    },
    ring: {
      name: "Ring of Blue Plasma",
      image: wikiImg("Ring_of_Blue_Plasma.gif"),
      color: "#2f6fb2",
    },
  },
  ED: {
    code: "ED",
    name: "Elder Druid",
    emoji: "🌿",
    potion: {
      name: "Mastermind Potion",
      image: wikiImg("Mastermind_Potion.gif"),
      color: "#3f8f4f",
    },
    amulet: {
      name: "Collar of Green Plasma",
      image: wikiImg("Collar_of_Green_Plasma.gif"),
      color: "#3f9142",
    },
    ring: {
      name: "Ring of Green Plasma",
      image: wikiImg("Ring_of_Green_Plasma.gif"),
      color: "#3f9142",
    },
  },
  MS: {
    code: "MS",
    name: "Master Sorcerer",
    emoji: "🔥",
    potion: {
      name: "Mastermind Potion",
      image: wikiImg("Mastermind_Potion.gif"),
      color: "#3f8f4f",
    },
    amulet: {
      name: "Collar of Green Plasma",
      image: wikiImg("Collar_of_Green_Plasma.gif"),
      color: "#3f9142",
    },
    ring: {
      name: "Ring of Green Plasma",
      image: wikiImg("Ring_of_Green_Plasma.gif"),
      color: "#3f9142",
    },
  },
  MK: {
    code: "MK",
    name: "Monk",
    emoji: "🥋",
    potion: {
      name: "Transcendence Potion",
      image: wikiImg("Transcendence_Potion.gif"),
      color: "#c9772b",
    },
    amulet: {
      name: "Collar of Orange Plasma",
      image: wikiImg("Collar_of_Orange_Plasma.gif"),
      color: "#d17a2a",
    },
    ring: {
      name: "Ring of Orange Plasma",
      image: wikiImg("Ring_of_Orange_Plasma.gif"),
      color: "#d17a2a",
    },
  },
};

export const VOCATION_ORDER: VocationCode[] = ["EK", "ED", "MS", "RP", "MK"];
