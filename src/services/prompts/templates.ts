import type { LLMMessage, LearnerContext } from "@/services/llm/provider.interface";
import type { SupportedLanguage } from "@/app/types/chat";

const LANG_LABEL: Record<SupportedLanguage, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  ja: "Japanese",
  ko: "Korean",
  zh: "Mandarin Chinese",
  pt: "Portuguese",
  it: "Italian",
  ru: "Russian",
};


const CEFR_DESC: Record<LearnerContext["cefrLevel"], string> = {
  A1: "absolute beginner — simple words and phrases only",
  A2: "elementary — basic sentences and familiar topics",
  B1: "intermediate — can handle routine situations",
  B2: "upper-intermediate — nuanced discussion on abstract topics",
  C1: "advanced — fluent and precise communication",
};

export function buildTutorSystemMessage(ctx: LearnerContext): LLMMessage {
  const lang  = LANG_LABEL[ctx.language];
  const level = CEFR_DESC[ctx.cefrLevel];
  const topic = ctx.topic
    ? `The current lesson topic is: "${ctx.topic}".`
    : "Choose a topic appropriate for the student's level.";

  return {
    role: "system",
    content: `
You are Coach Lina, a warm, encouraging ${lang} tutor in a Duolingo classroom.
Student: ${ctx.studentName ?? "a learner"} — CEFR ${ctx.cefrLevel} (${level}).

${topic}

Rules:
- Reply ONLY in ${lang}, calibrated to the student's level.
- A1/A2: very short sentences, common vocabulary.
- B1+: richer grammar, idioms are welcome.
- Correct errors gently inline using [corrected: …] markers.
- End each reply with a follow-up question or encouraging remark.
- Keep replies to 2–4 sentences maximum.
- This is a K-12 safe environment — stay strictly on-topic.
    `.trim(),
  };
}


export interface GrammarFeedback {
  corrected: string;
  errors: Array<{ original: string; fix: string; explanation: string }>;
  encouragement: string;
}

export function buildGrammarCorrectionMessages(
  original: string,
  ctx: Pick<LearnerContext, "language" | "cefrLevel">,
): LLMMessage[] {
  const lang = LANG_LABEL[ctx.language];

  return [
    {
      role: "system",
      content: `
You are a precise ${lang} grammar coach for a CEFR ${ctx.cefrLevel} student.
Respond ONLY with a valid JSON object — no markdown, no extra text:

{
  "corrected": "<corrected sentence>",
  "errors": [
    {
      "original": "<wrong phrase>",
      "fix": "<correct phrase>",
      "explanation": "<one plain-language reason>"
    }
  ],
  "encouragement": "<one short positive sentence in English>"
}

If the sentence is already correct, return an empty "errors" array.
      `.trim(),
    },
    {
      role: "user",
      content: `Please correct this ${lang} sentence:\n\n"${original}"`,
    },
  ];
}


export interface RoleplayScenario {
  title: string;
  setting: string;
  coachRole: string;
  studentGoal: string;
}

const SCENARIO_BANK: Record<SupportedLanguage, RoleplayScenario[]> = {
  es: [
    { title: "Café Order",       setting: "A café in Madrid",         coachRole: "barista",            studentGoal: "Order a coffee and pastry" },
    { title: "Asking Directions",setting: "A busy street in Barcelona",coachRole: "local passerby",     studentGoal: "Find the nearest metro station" },
    { title: "Hotel Check-in",   setting: "A hotel in Seville",       coachRole: "front-desk clerk",   studentGoal: "Check in and ask about breakfast" },
  ],
  fr: [
    { title: "Boulangerie",      setting: "A bakery in Paris",        coachRole: "baker",              studentGoal: "Buy bread and ask for the price" },
    { title: "Train Station",    setting: "Gare du Nord, Paris",      coachRole: "ticket agent",       studentGoal: "Buy a ticket to Lyon" },
    { title: "Restaurant",       setting: "A bistro in Nice",         coachRole: "waiter",             studentGoal: "Order a meal and ask for the bill" },
  ],
  de: [
    { title: "Supermarkt",       setting: "A supermarket in Berlin",  coachRole: "cashier",            studentGoal: "Buy groceries and ask where something is" },
    { title: "Arzt",             setting: "A doctor's office",        coachRole: "receptionist",       studentGoal: "Make an appointment" },
    { title: "Bahnhof",          setting: "Hamburg main station",     coachRole: "information desk",   studentGoal: "Ask about train times" },
  ],
  ja: [
    { title: "コンビニ",          setting: "A convenience store",     coachRole: "store clerk",        studentGoal: "Buy items and ask for a bag" },
    { title: "道案内",            setting: "Shibuya crossing",        coachRole: "pedestrian",         studentGoal: "Ask for directions to Harajuku" },
    { title: "レストラン",         setting: "A ramen shop in Tokyo",  coachRole: "waiter",             studentGoal: "Order ramen and ask about spice level" },
  ],
  en: [
    { title: "Job Interview",    setting: "An office in London",      coachRole: "interviewer",        studentGoal: "Introduce yourself and discuss your experience" },
    { title: "Airport",          setting: "Heathrow Airport",         coachRole: "check-in agent",     studentGoal: "Check in for a flight" },
    { title: "Phone Call",       setting: "Making a reservation",     coachRole: "restaurant host",    studentGoal: "Book a table for two" },
  ],
  ko: [
    { title: "편의점",            setting: "A convenience store",     coachRole: "cashier",            studentGoal: "Buy snacks and pay" },
    { title: "지하철",            setting: "Seoul Metro",             coachRole: "station staff",      studentGoal: "Buy a transit card and ask for directions" },
    { title: "식당",              setting: "A Korean BBQ restaurant", coachRole: "server",             studentGoal: "Order food and ask for refills" },
  ],
  zh: [
    { title: "菜市场",            setting: "A market in Beijing",     coachRole: "vendor",             studentGoal: "Buy vegetables and negotiate price" },
    { title: "地铁站",            setting: "Shanghai Metro",          coachRole: "station staff",      studentGoal: "Ask how to get to the Bund" },
    { title: "餐厅",              setting: "A dim sum restaurant",    coachRole: "waiter",             studentGoal: "Order dishes and ask for tea" },
  ],
  pt: [
    { title: "Mercado",          setting: "A market in Lisbon",      coachRole: "vendor",             studentGoal: "Buy fruit and ask the price" },
    { title: "Farmácia",         setting: "A pharmacy in Porto",     coachRole: "pharmacist",         studentGoal: "Ask for headache medicine" },
    { title: "Café",             setting: "A café in Rio",           coachRole: "barista",            studentGoal: "Order coffee and a snack" },
  ],
  it: [
    { title: "Gelateria",        setting: "An ice-cream shop in Rome",coachRole: "gelato maker",      studentGoal: "Choose flavours and pay" },
    { title: "Farmacia",         setting: "A pharmacy in Milan",     coachRole: "pharmacist",         studentGoal: "Ask for medicine for a cold" },
    { title: "Trattoria",        setting: "A restaurant in Florence",coachRole: "waiter",             studentGoal: "Order pasta and ask for the bill" },
  ],
  ru: [
    { title: "Магазин",          setting: "A shop in Moscow",        coachRole: "shop assistant",     studentGoal: "Buy clothes and ask about size" },
    { title: "Кафе",             setting: "A café in St Petersburg", coachRole: "barista",            studentGoal: "Order coffee and a cake" },
    { title: "Аптека",           setting: "A pharmacy",             coachRole: "pharmacist",         studentGoal: "Ask for medicine" },
  ],
};


export function buildRoleplayMessages(
  ctx: LearnerContext,
  scenarioIndex?: number,
): { messages: LLMMessage[]; scenario: RoleplayScenario } {
  const bank     = SCENARIO_BANK[ctx.language] ?? SCENARIO_BANK.en;
  const idx      = scenarioIndex ?? Math.floor(Math.random() * bank.length);
  const scenario = bank[idx % bank.length];
  const lang     = LANG_LABEL[ctx.language];

  const messages: LLMMessage[] = [
    {
      role: "system",
      content: `
You are playing the role of a ${scenario.coachRole} in ${scenario.setting}.
The student (CEFR ${ctx.cefrLevel}) wants to: ${scenario.studentGoal}.
Speak ONLY in ${lang} at their level.
After each student turn add a single line: 💡 Hint: <grammar or vocab tip in English>.
Stay in character throughout. Keep it natural and friendly.
      `.trim(),
    },
    {
      role: "user",
      content: `Start the roleplay. Greet me as a ${scenario.coachRole} in ${lang} and set the scene in one sentence.`,
    },
  ];

  return { messages, scenario };
}


export interface TranslationResult {
  translation: string;
  breakdown: Array<{ source: string; target: string; note: string }>;
  culturalNote: string;
}

export function buildTranslationMessages(
  text: string,
  targetLang: SupportedLanguage,
  nativeLang: SupportedLanguage = "en",
): LLMMessage[] {
  const target = LANG_LABEL[targetLang];
  const native = LANG_LABEL[nativeLang];

  return [
    {
      role: "system",
      content: `
You are a bilingual ${target}/${native} translation assistant for language learners.
Respond ONLY with a valid JSON object — no markdown:

{
  "translation": "<translated text>",
  "breakdown": [
    { "source": "<word/phrase>", "target": "<translation>", "note": "<grammar or cultural note>" }
  ],
  "culturalNote": "<one-sentence cultural insight, or empty string>"
}
      `.trim(),
    },
    {
      role: "user",
      content: `Translate to ${target} and explain key parts:\n\n"${text}"`,
    },
  ];
}

export interface VocabSuggestion {
  words: Array<{ word: string; meaning: string; example: string }>;
  grammarFocus: string;
}

export function buildVocabSuggestionMessages(
  conversationSnippet: string,
  ctx: Pick<LearnerContext, "language" | "cefrLevel">,
): LLMMessage[] {
  const lang = LANG_LABEL[ctx.language];

  return [
    {
      role: "system",
      content: `
You are a ${lang} vocabulary coach for a CEFR ${ctx.cefrLevel} student.
Analyse the conversation and respond ONLY with a valid JSON object:

{
  "words": [
    { "word": "<${lang} word>", "meaning": "<meaning in English>", "example": "<example sentence>" }
  ],
  "grammarFocus": "<one grammar topic worth reviewing>"
}

Return 4–6 vocabulary items. Prioritise words the student used incorrectly or avoided.
      `.trim(),
    },
    {
      role: "user",
      content: `Recent conversation:\n\n${conversationSnippet}`,
    },
  ];
}
