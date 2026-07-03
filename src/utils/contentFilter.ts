export type FilterStatus = "safe" | "flagged" | "blocked";

export interface FilterResult {
  status: FilterStatus;
  matchedWord?: string;
  matchedPattern?: string;
}


const STATIC_BANNED: ReadonlySet<string> = new Set([
  "stupid", "idiot", "moron", "dumb", "fool", "loser",
  "jerk", "creep", "freak", "scum", "trash", "filth",
  "bastard", "asshole", "bitch", "dick", "prick", "cunt",
  "twat", "wanker", "jackass", "douchebag", "numbskull",

  "kill", "murder", "stab", "shoot", "bomb", "explode",
  "attack", "destroy", "hurt", "harm", "suicide", "hang",
  "poison", "weapon", "rape", "abuse", "strangle", "torture",
  "massacre", "slaughter",

  "racist", "racism", "nazi", "fascist", "nigger", "nigga",
  "faggot", "retard", "spastic", "terrorist", "supremacist",
  "antisemit", "xenophob",

  "spam", "scam", "phishing", "malware", "ransomware", "virus",
  "trojan", "keylogger", "exploit", "ddos", "botnet",

  "cocaine", "heroin", "methamphetamin", "meth", "fentanyl",
  "overdose", "drug deal", "crack cocaine",

]);


let runtimeBanned: Set<string> = new Set();


const LS_KEY = "duolingo_banned_words_v1";

function loadFromStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const words: unknown = JSON.parse(raw);
      if (Array.isArray(words)) {
        runtimeBanned = new Set(
          words.filter((w): w is string => typeof w === "string"),
        );
      }
    }
  } catch {
    
  }
}

function saveToStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...runtimeBanned]));
  } catch {
  
  }
}

if (typeof window !== "undefined") {
  loadFromStorage();
}


export function addBannedWord(word: string): void {
  const normalized = word.trim().toLowerCase();
  if (normalized.length < 2) return;
  runtimeBanned.add(normalized);
  saveToStorage();
}

export function removeBannedWord(word: string): void {
  const normalized = word.trim().toLowerCase();
  runtimeBanned.delete(normalized);
  saveToStorage();
}

export function getDynamicBannedWords(): string[] {
  return [...runtimeBanned].sort();
}

export function clearDynamicBannedWords(): void {
  runtimeBanned.clear();
  saveToStorage();
}

export function getStaticBannedWords(): string[] {
  return [...STATIC_BANNED].sort();
}


interface PatternRule {
  name: string;
  pattern: RegExp;
  status: FilterStatus;
}

const PATTERN_RULES: PatternRule[] = [
  {
    name: "external_link",
    pattern: /\b(https?:\/\/|www\.)\S+/i,
    status: "flagged",
  },
  {
    name: "credit_card",
    pattern: /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/,
    status: "blocked",
  },
  {
    name: "ssn",
    pattern: /\b\d{3}-\d{2}-\d{4}\b/,
    status: "blocked",
  },
 
  {
    name: "credential_request",
    pattern: /\b(password|credit\s*card|cvv|pin\s*number|bank\s*account)\b/i,
    status: "flagged",
  },
  
  {
    name: "grooming_meetup",
    pattern: /\b(meet\s+me|come\s+to)\s+(my\s+place|my\s+house|my\s+room|my\s+apartment)\b/i,
    status: "blocked",
  },

  {
    name: "phone_number",
    pattern: /\b(\+?\d[\d\s\-().]{7,}\d)\b/,
    status: "flagged",
  },
 
  {
    name: "financial_scam",
    pattern: /\b(send\s+money|wire\s+transfer|bitcoin\s+address|crypto\s+wallet|make\s+money\s+fast|free\s+money)\b/i,
    status: "flagged",
  },
];


export function checkContent(content: string): FilterResult {
  if (typeof content !== "string") {
    return { status: "flagged", matchedPattern: "invalid_type" };
  }

  const normalized = content.trim().toLowerCase();

  if (normalized.length < 2) {
    return { status: "flagged", matchedPattern: "too_short" };
  }

  
  for (const word of STATIC_BANNED) {
    if (matchesWord(normalized, word)) {
      return { status: "blocked", matchedWord: word };
    }
  }

  for (const word of runtimeBanned) {
    if (matchesWord(normalized, word)) {
      return { status: "blocked", matchedWord: word };
    }
  }

  for (const rule of PATTERN_RULES) {
    if (rule.pattern.test(content)) {
      return { status: rule.status, matchedPattern: rule.name };
    }
  }

  return { status: "safe" };
}

export function getSafetyStatus(
  content: string,
): "safe" | "flagged" | "blocked" {
  return checkContent(content).status;
}


function matchesWord(text: string, word: string): boolean {
  if (word.includes(" ")) {
    return text.includes(word);
  }
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}`, "i").test(text);
}
