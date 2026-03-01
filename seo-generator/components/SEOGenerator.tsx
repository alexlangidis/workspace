"use client";

import { useEffect, useMemo, useState } from "react";
import { type ProductType } from "@/utils/generateText";
import { slugify } from "@/utils/slugify";

type SEOFields = {
  focusKeyword: string;
  seoTitle: string;
  slug: string;
  metaDescription: string;
  categoryDescription: string;
};

const PRODUCT_TYPES: ProductType[] = ["Θήκες", "Προστασία Οθόνης (Tempered Glass)"];

function buildSeoFields(model: string, productType: ProductType): SEOFields {
  if (!model.trim()) {
    return {
      focusKeyword: "",
      seoTitle: "",
      slug: "",
      metaDescription: "",
      categoryDescription: "",
    };
  }

  if (productType === "Προστασία Οθόνης (Tempered Glass)") {
    const focusKeyword = `Προστασία Οθόνης ${model}`;

    return {
      focusKeyword,
      seoTitle: `Προστασία Οθόνης ${model} | Tempered Glass`,
      slug: `${slugify(model)}-tempered-glass`,
      metaDescription: `Προστάτευσε το ${model} με Προστασία Οθόνης ${model} και tempered glass 9H υψηλής αντοχής. Απόλυτη διαφάνεια και τέλεια εφαρμογή.`,
      categoryDescription: "",
    };
  }

  const focusKeyword = `Θήκες ${model}`;

  return {
    focusKeyword,
    seoTitle: `Θήκες ${model} | Προστασία & Στυλ`,
    slug: `${slugify(model)}-thikes`,
    metaDescription: `Ανακάλυψε Θήκες ${model} για απόλυτη προστασία και μοντέρνο design. Ανθεκτικές, λειτουργικές και ιδανικές για καθημερινή χρήση.`,
    categoryDescription: "",
  };
}

type FieldCardProps = {
  label: string;
  value: string;
  limit?: number;
};

function FieldCard({ label, value, limit }: FieldCardProps) {
  const [copied, setCopied] = useState(false);
  const length = value.length;
  const isOverLimit = typeof limit === "number" && length > limit;

  const handleCopy = async () => {
    if (!value) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <article className="group rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</h3>
        <div className="flex items-center gap-3">
          {typeof limit === "number" && (
            <span className={`text-xs font-semibold ${isOverLimit ? "text-rose-600" : "text-slate-500"}`}>
              {length}/{limit}
            </span>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="cursor-pointer rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <p className={`break-words rounded-xl border border-slate-100 bg-slate-50/90 p-3 text-sm leading-6 ${isOverLimit ? "text-rose-700" : "text-slate-800"}`}>
        {value || "-"}
      </p>
    </article>
  );
}

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

type CategoryDescriptionCardProps = {
  value: string;
  focusKeyword: string;
  onGenerateAI: () => Promise<void>;
  isGenerating: boolean;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderDescriptionWithBoldKeyword(value: string, focusKeyword: string) {
  const paragraphs = value.split(/\n\s*\n/);
  const pattern = focusKeyword.trim() ? new RegExp(`(${escapeRegExp(focusKeyword)})`, "gi") : null;

  return paragraphs.map((paragraph, paragraphIndex) => {
    const line = paragraph.trim();
    if (!line) return null;

    if (!pattern) {
      return (
        <p key={`p-${paragraphIndex}`} className="mb-3 last:mb-0">
          {line}
        </p>
      );
    }

    const parts = line.split(pattern);
    return (
      <p key={`p-${paragraphIndex}`} className="mb-3 last:mb-0">
        {parts.map((part, partIndex) =>
          part.toLowerCase() === focusKeyword.toLowerCase() ? (
            <strong key={`k-${paragraphIndex}-${partIndex}`} className="font-semibold text-slate-900">
              {part}
            </strong>
          ) : (
            <span key={`t-${paragraphIndex}-${partIndex}`}>{part}</span>
          ),
        )}
      </p>
    );
  });
}

function CategoryDescriptionCard({ value, focusKeyword, onGenerateAI, isGenerating }: CategoryDescriptionCardProps) {
  const [copied, setCopied] = useState(false);
  const words = countWords(value);
  const isInTargetRange = words >= 180 && words <= 260;

  const handleCopy = async () => {
    if (!value) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <article className="rounded-2xl border border-white/60 bg-white/85 p-4 shadow-sm backdrop-blur-sm md:p-5">
      <div className="mb-3 grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Category Description</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onGenerateAI}
            disabled={isGenerating}
            className="cursor-pointer rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isGenerating ? "Generating..." : "Generate AI"}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between text-xs">
        <span className={isInTargetRange ? "font-semibold text-emerald-700" : "font-semibold text-rose-600"}>Words: {words}</span>
        <span className="font-medium text-slate-500">Target: 180-260 words</span>
      </div>

      {isGenerating ? (
        <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-11/12 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-10/12 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-9/12 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-8/12 animate-pulse rounded bg-slate-200" />
        </div>
      ) : (
        <div className={`rounded-xl border border-slate-100 bg-slate-50/90 p-4 text-sm leading-7 ${isInTargetRange ? "text-slate-800" : "text-rose-700"}`}>
          {value ? renderDescriptionWithBoldKeyword(value, focusKeyword) : "-"}
        </div>
      )}
    </article>
  );
}

export default function SEOGenerator() {
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [productType, setProductType] = useState<ProductType>("Θήκες");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const fullModel = useMemo(() => {
    const modelText = model.trim();
    const brandText = brand.trim();

    if (!modelText) {
      return "";
    }

    return brandText ? `${brandText} ${modelText}` : modelText;
  }, [brand, model]);

  const fields = useMemo(() => buildSeoFields(fullModel, productType), [fullModel, productType]);

  useEffect(() => {
    setCategoryDescription(fields.categoryDescription);
  }, [fields.categoryDescription]);

  const generateAI = async () => {
    if (!fullModel.trim()) {
      return;
    }

    setIsGeneratingAI(true);
    setCategoryDescription("");

    try {
      const type = productType === "Προστασία Οθόνης (Tempered Glass)" ? "glass" : "cases";

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: fullModel, type }),
      });

      const data = (await res.json()) as { text?: string };
      if (data.text) {
        setCategoryDescription(data.text);
      }
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-10 md:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-cyan-300/40 blur-3xl" />
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-amber-200/50 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-sky-200/50 blur-3xl" />
      </div>

      <div className="mx-auto w-full max-w-5xl rounded-3xl border border-white/60 bg-white/70 p-5 shadow-xl backdrop-blur-xl md:p-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">RankMath Toolkit</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">SEO Generator</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 md:text-base">
              Generate ready-to-use SEO fields for WooCommerce categories and product pages.
            </p>
          </div>
          <div className="rounded-full border border-white/80 bg-white/90 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
            Gemini 2.5 Flash
          </div>
        </header>

        <section className="mb-7 grid gap-4 rounded-2xl border border-white/70 bg-white/80 p-4 md:grid-cols-2 md:p-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="brand" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Brand (optional)
            </label>
            <input
              id="brand"
              type="text"
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="Samsung"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="model" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Model (required)
            </label>
            <input
              id="model"
              type="text"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="Galaxy S26 Ultra"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label htmlFor="productType" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Product Type
            </label>
            <select
              id="productType"
              value={productType}
              onChange={(event) => setProductType(event.target.value as ProductType)}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            >
              {PRODUCT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <FieldCard label="Focus Keyword" value={fields.focusKeyword} />
          <FieldCard label="SEO Title" value={fields.seoTitle} limit={60} />
          <FieldCard label="Meta Description" value={fields.metaDescription} limit={160} />
          <FieldCard label="Slug" value={fields.slug} />
          <div className="md:col-span-2">
            <CategoryDescriptionCard
              value={categoryDescription}
              focusKeyword={fields.focusKeyword}
              onGenerateAI={generateAI}
              isGenerating={isGeneratingAI}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
