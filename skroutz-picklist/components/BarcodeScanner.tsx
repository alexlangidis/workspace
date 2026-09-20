"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, LoaderCircle, X } from "lucide-react";

type BarcodeScannerProps = {
  onDetected: (value: string) => void;
  onClose: () => void;
  expectedProduct?: {
    title: string;
    ean: string;
  };
};

type ScannerControls = {
  stop: () => void;
};

export function BarcodeScanner({ onDetected, onClose, expectedProduct }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<ScannerControls | null>(null);
  const handledRef = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let disposed = false;
    const video = videoRef.current;

    async function startScanner() {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (disposed || !videoRef.current) return;

        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          videoRef.current,
          (result) => {
            if (!result || disposed || handledRef.current) return;
            handledRef.current = true;
            controlsRef.current?.stop();
            onDetected(result.getText());
          },
        );

        if (disposed) {
          controls.stop();
        } else {
          controlsRef.current = controls;
          setStatus("ready");
        }
      } catch (caughtError) {
        if (disposed) return;
        setStatus("error");
        setError(caughtError instanceof Error ? caughtError.message : "Δεν ήταν δυνατή η εκκίνηση της κάμερας.");
      }
    }

    handledRef.current = false;
    void startScanner();

    return () => {
      disposed = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
      const stream = video?.srcObject;
      if (stream && typeof MediaStream !== "undefined" && stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
      if (video) video.srcObject = null;
    };
  }, [attempt, onDetected]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="barcode-scanner-title">
      <div className="w-full max-w-lg overflow-hidden rounded-[28px] border border-white/10 bg-paper text-ink shadow-2xl">
        <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-teal"><Camera size={14} /> Κάμερα</p>
            <h2 id="barcode-scanner-title" className="mt-1 font-display text-2xl font-semibold tracking-[-0.05em]">Σκάναρε το barcode</h2>
            {expectedProduct && (
              <div className="mt-2 max-w-[280px] text-xs font-medium text-muted">
                <p className="truncate">{expectedProduct.title}</p>
                <p className="mt-1 font-mono text-[11px] text-teal">EAN: {expectedProduct.ean}</p>
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-xl border border-line text-muted transition hover:border-ink hover:text-ink" aria-label="Κλείσιμο scanner"><X size={19} /></button>
        </div>

        <div className="relative aspect-[4/3] overflow-hidden bg-ink">
          <video ref={videoRef} autoPlay muted playsInline className="size-full object-cover" aria-label="Προεπισκόπηση κάμερας για barcode" />
          <div className="pointer-events-none absolute inset-0 grid place-items-center p-10">
            <div className="relative aspect-[2.8/1] w-full max-w-sm rounded-2xl border-2 border-lime shadow-[0_0_0_999px_rgba(16,32,29,0.38)]">
              <span className="absolute inset-x-5 top-1/2 h-px animate-pulse bg-lime/90" />
            </div>
          </div>

          {status === "loading" && <div className="absolute inset-0 grid place-items-center bg-ink/55 text-center text-white"><div><LoaderCircle size={32} className="mx-auto animate-spin text-lime" /><p className="mt-3 text-sm font-semibold">Άνοιγμα κάμερας...</p></div></div>}
          {status === "error" && <div className="absolute inset-0 grid place-items-center bg-ink/80 px-8 text-center text-white"><div><AlertTriangle size={32} className="mx-auto text-coral" /><p className="mt-3 text-sm font-semibold">Δεν άνοιξε η κάμερα</p><p className="mt-2 text-xs leading-5 text-white/70">Έλεγξε την άδεια κάμερας και ότι χρησιμοποιείς HTTPS ή localhost.</p><p className="mt-2 max-h-12 overflow-hidden text-[10px] text-white/40">{error}</p><button type="button" onClick={() => { setStatus("loading"); setError(""); setAttempt((value) => value + 1); }} className="mt-5 rounded-xl bg-lime px-4 py-2 text-xs font-bold text-ink">Δοκίμασε ξανά</button></div></div>}
        </div>

        <p className="px-5 py-4 text-center text-xs font-medium leading-5 text-muted sm:px-6">
          {expectedProduct
            ? `Σκάναρε το EAN ${expectedProduct.ean}. Αν είναι σωστό, η ποσότητα αυτού του προϊόντος θα αυξηθεί κατά 1.`
            : "Κράτησε το barcode μέσα στο πλαίσιο. Αν είναι EAN της παραγγελίας, η ποσότητα θα αυξηθεί αυτόματα κατά 1."}
        </p>
      </div>
    </div>
  );
}
