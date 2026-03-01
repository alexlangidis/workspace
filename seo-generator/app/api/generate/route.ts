import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

type GenerateBody = {
  deviceModel?: string;
  model?: string; // backward compatibility (legacy device model field)
  llmModel?: string;
  type?: "glass" | "cases";
};

const DEFAULT_LLM_MODEL = "gemini-2.5-flash";
const MIN_WORDS = 220;
const MAX_WORDS = 250;
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const RATE_LIMIT_WINDOW_MS = 1000 * 60;
const RATE_LIMIT_MAX_REQUESTS = 12;

type CacheEntry = {
  text: string;
  llmModel: string;
  createdAt: number;
};

const responseCache = new Map<string, CacheEntry>();
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizeOutput(text: string): string {
  let cleaned = text.trim();

  cleaned = cleaned.replace(/```[\s\S]*?```/g, (block) =>
    block.replace(/```/g, "").trim(),
  );
  // Remove markdown emphasis markers if the model adds them around keywords.
  cleaned = cleaned.replace(/\*\*([\s\S]+?)\*\*/g, "$1");
  cleaned = cleaned.replace(/\*([\s\S]+?)\*/g, "$1");
  cleaned = cleaned.replace(/^['"«»]+|['"«»]+$/g, "").trim();
  cleaned = cleaned
    .replace(/^(description|περιγραφή|seo\s*description)\s*:\s*/i, "")
    .trim();

  const lines = cleaned.split("\n");
  const prefacePattern =
    /^(ορίστε|παρακάτω|βεβαίως|φυσικά|sure|here|δώσε|σου δίνω)/i;
  const firstContentIndex = lines.findIndex(
    (line) => !prefacePattern.test(line.trim()),
  );

  if (firstContentIndex > 0) {
    cleaned = lines.slice(firstContentIndex).join("\n").trim();
  }

  return cleaned;
}

function ensureParagraphBreaks(text: string): string {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return normalized;

  // Keep model formatting when it already includes paragraph spacing.
  if (/\n\s*\n/.test(normalized)) {
    return normalized;
  }

  // Fallback: split into two readable paragraphs near sentence boundaries.
  const sentences = normalized.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g);
  if (!sentences || sentences.length < 4) {
    return normalized;
  }

  const midpoint = Math.ceil(sentences.length / 2);
  const first = sentences
    .slice(0, midpoint)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const second = sentences
    .slice(midpoint)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!first || !second) return normalized;
  return `${first}\n\n${second}`;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countExactKeyword(text: string, keyword: string): number {
  const pattern = new RegExp(escapeRegExp(keyword), "gi");
  return text.match(pattern)?.length ?? 0;
}

function validateDescription(text: string, focusKeyword: string): string[] {
  const issues: string[] = [];
  const words = wordCount(text);
  const keywordMatches = countExactKeyword(text, focusKeyword);

  if (words < MIN_WORDS || words > MAX_WORDS) {
    issues.push(
      `Word count out of range (${words}, expected ${MIN_WORDS}-${MAX_WORDS}).`,
    );
  }

  if (keywordMatches < 2 || keywordMatches > 3) {
    issues.push(
      `Focus keyword exact-match count invalid (${keywordMatches}, expected 2-3).`,
    );
  }

  if (/^#+\s/m.test(text) || /```/.test(text)) {
    issues.push("Markdown detected.");
  }

  if (/^['"«»][\s\S]*['"«»]$/.test(text.trim())) {
    issues.push("Whole output is wrapped in quotes.");
  }

  return issues;
}

function parseJsonDescription(raw: string): string | null {
  const trimmed = raw.trim();

  try {
    const direct = JSON.parse(trimmed) as { description?: string };
    if (typeof direct.description === "string" && direct.description.trim()) {
      return direct.description.trim();
    }
  } catch {
    // fall through to extraction
  }

  const candidate = trimmed.match(/\{[\s\S]*\}/)?.[0];
  if (!candidate) return null;

  try {
    const parsed = JSON.parse(candidate) as { description?: string };
    if (typeof parsed.description === "string" && parsed.description.trim()) {
      return parsed.description.trim();
    }
  } catch {
    return null;
  }

  return null;
}

function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.headers.get("x-real-ip") ?? "unknown";
}

function checkRateLimit(clientIp: string): {
  allowed: boolean;
  retryAfterSec?: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(clientIp);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(clientIp, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return { allowed: false, retryAfterSec };
  }

  entry.count += 1;
  rateLimitStore.set(clientIp, entry);
  return { allowed: true };
}

function buildBasePrompt(
  type: "glass" | "cases",
  focusKeyword: string,
): string {
  const typeSpecificRules =
    type === "glass"
      ? [
          "Περιέλαβε φυσικά και ακριβώς τα στοιχεία: 9H, διαφάνεια, bubble-free, touch sensitivity.",
          "Το ύφος να τονίζει καθαρή εικόνα και ακριβή απόκριση αφής.",
        ].join("\n")
      : [
          "Περιέλαβε φυσικά και ακριβώς τα στοιχεία: προστασία από πτώσεις, υλικά TPU/silicone, design.",
          "Το ύφος να τονίζει ανθεκτικότητα και καθημερινή εργονομία.",
        ].join("\n");

  return [
    "Γράψε SEO category description στα Ελληνικά.",
    `Το κείμενο να είναι ${MIN_WORDS}-${MAX_WORDS} λέξεις.`,
    `Focus keyword: \"${focusKeyword}\"`,
    "Το focus keyword να εμφανιστεί ακριβώς 2-3 φορές (exact match).",
    typeSpecificRules,
    "Μορφοποίηση: 2-3 μικρές παραγράφους με κενή γραμμή ανάμεσα στις παραγράφους.",
    "Κλείσε με σύντομο CTA.",
    'Επέστρεψε ΑΠΟΚΛΕΙΣΤΙΚΑ valid JSON στη μορφή: {\"description\":\"...\",\"keyword_count\":number,\"word_count\":number}',
    "Χωρίς markdown, χωρίς τίτλους, χωρίς πολλαπλές εκδοχές, χωρίς εξηγήσεις εκτός JSON.",
    "Μην χρησιμοποιείς αστερίσκους μορφοποίησης όπως **κείμενο** ή *κείμενο*.",
  ].join("\n");
}

async function generateAndValidate(
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  basePrompt: string,
  focusKeyword: string,
): Promise<{ text: string; attempts: number; issues: string[] }> {
  let lastText = "";
  let lastIssues: string[] = [];

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const prompt =
      attempt === 1
        ? basePrompt
        : [
            basePrompt,
            "ΠΡΟΗΓΟΥΜΕΝΟ ΜΗ-ΣΥΜΜΟΡΦΟΥΜΕΝΟ OUTPUT:",
            lastText,
            "Διόρθωσέ το ώστε να τηρεί ΟΛΟΥΣ τους κανόνες και επέστρεψε ΜΟΝΟ το JSON.",
          ].join("\n\n");

    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const jsonDescription = parseJsonDescription(raw);
    const candidate = ensureParagraphBreaks(sanitizeOutput(jsonDescription ?? raw));
    const issues = validateDescription(candidate, focusKeyword);
    lastIssues = issues;

    if (issues.length === 0) {
      return { text: candidate, attempts: attempt, issues: [] };
    }

    // If we already got a usable long text but with minor rule misses,
    // avoid another slow model call and return it as-is.
    if (attempt === 1 && wordCount(candidate) >= 180) {
      return { text: candidate, attempts: attempt, issues };
    }

    lastText = candidate;
  }

  if (lastText) {
    return { text: lastText, attempts: 2, issues: lastIssues };
  }

  throw new Error("Model output was empty.");
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  const clientIp = getClientIp(req);

  try {
    const rateLimit = checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSec ?? 60) },
        },
      );
    }

    const { model, deviceModel, llmModel, type } =
      (await req.json()) as GenerateBody;

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY" },
        { status: 500 },
      );
    }

    const cleanDeviceModel = (deviceModel ?? model ?? "").trim();
    const cleanLlmModel = (llmModel ?? DEFAULT_LLM_MODEL).trim();

    if (
      !cleanDeviceModel ||
      !cleanLlmModel ||
      (type !== "glass" && type !== "cases")
    ) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const focusKeyword =
      type === "glass"
        ? `Προστασία Οθόνης ${cleanDeviceModel}`
        : `Θήκες ${cleanDeviceModel}`;

    const cacheKey = `${type}::${cleanDeviceModel}::${cleanLlmModel}`;
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
      console.info("[seo-generator] cache_hit", {
        type,
        deviceModel: cleanDeviceModel,
        llmModel: cached.llmModel,
        durationMs: Date.now() - startedAt,
      });

      return NextResponse.json({
        text: cached.text,
        llmModel: cached.llmModel,
        cached: true,
      });
    }

    const prompt = buildBasePrompt(type, focusKeyword);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const modelAI = genAI.getGenerativeModel({ model: cleanLlmModel });
    const { text, attempts, issues } = await generateAndValidate(
      modelAI,
      prompt,
      focusKeyword,
    );

    responseCache.set(cacheKey, {
      text,
      llmModel: cleanLlmModel,
      createdAt: Date.now(),
    });

    // Opportunistic cache cleanup to avoid unbounded growth.
    if (responseCache.size > 500) {
      const now = Date.now();
      for (const [key, value] of responseCache.entries()) {
        if (now - value.createdAt > CACHE_TTL_MS) {
          responseCache.delete(key);
        }
      }
    }

    console.info("[seo-generator] generated", {
      type,
      deviceModel: cleanDeviceModel,
      llmModel: cleanLlmModel,
      attempts,
      durationMs: Date.now() - startedAt,
      wordCount: wordCount(text),
      keywordCount: countExactKeyword(text, focusKeyword),
      validationIssues: issues,
    });

    return NextResponse.json({ text, llmModel: cleanLlmModel, cached: false });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to generate text";
    console.error("[seo-generator] failed", {
      error: message,
      durationMs: Date.now() - startedAt,
      clientIp,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
