"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

/**
 * Leitor de código de barras pela câmera (BarcodeDetector — Chrome/Android).
 * Em navegadores sem suporte, orienta a usar leitor USB ou digitar o código.
 */
export function BarcodeScanner({
  onDetect,
  onClose,
}: {
  onDetect: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let active = true;

    const Detector = (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;

    if (!Detector) {
      setError(
        "Este navegador não lê código pela câmera. Use o Chrome no celular, um leitor USB (que digita sozinho no campo de busca) ou digite o código."
      );
      return;
    }

    const detector = new Detector({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "qr_code"],
    });

    async function tick() {
      if (!active) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        try {
          const codes = await detector.detect(video);
          if (codes.length > 0 && codes[0].rawValue) {
            navigator.vibrate?.(80);
            cleanup();
            onDetect(codes[0].rawValue);
            return;
          }
        } catch {
          // frame ruim — segue tentando
        }
      }
      raf = requestAnimationFrame(tick);
    }

    function cleanup() {
      active = false;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
        tick();
      })
      .catch(() => setError("Não consegui acessar a câmera. Verifique a permissão do navegador."));

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <p className="font-semibold">Apontar para o código de barras</p>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        {error ? (
          <p className="p-5 text-sm text-slate-600">{error}</p>
        ) : (
          <div className="relative">
            <video ref={videoRef} className="h-72 w-full bg-black object-cover" muted playsInline />
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-red-500/80" />
          </div>
        )}
      </div>
    </div>
  );
}
