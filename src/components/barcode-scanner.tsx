import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Loader2, ScanLine } from "lucide-react";

type ScannerState = "starting" | "scanning" | "denied" | "unavailable" | "error";

type Detector = {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue?: string }[]>;
};

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf"];

/**
 * Camera barcode reader. Uses the browser's built-in detector when available and
 * falls back to a JS decoder, so it works across mobile browsers.
 */
export function BarcodeScanner({
  onDetected,
  paused = false,
}: {
  onDetected: (barcode: string) => void;
  paused?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [state, setState] = useState<ScannerState>("starting");
  const [detecting, setDetecting] = useState(false);
  const handled = useRef(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const report = useCallback(
    (code: string) => {
      const clean = code.replace(/\D/g, "");
      if (handled.current || pausedRef.current || clean.length < 8) return;
      handled.current = true;
      onDetected(clean);
    },
    [onDetected],
  );

  useEffect(() => {
    if (!paused) handled.current = false;
  }, [paused]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;
    let zxingControls: { stop: () => void } | null = null;
    let cancelled = false;

    const stop = () => {
      if (interval) clearInterval(interval);
      zxingControls?.stop();
      stream?.getTracks().forEach((t) => t.stop());
    };

    const start = async () => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setState("unavailable");
        return;
      }

      const NativeDetector = (
        window as unknown as {
          BarcodeDetector?: new (opts: { formats: string[] }) => Detector;
        }
      ).BarcodeDetector;

      try {
        if (NativeDetector) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false,
          });
          if (cancelled) return stop();
          const video = videoRef.current;
          if (!video) return;
          video.srcObject = stream;
          await video.play().catch(() => undefined);
          setState("scanning");

          const detector = new NativeDetector({ formats: FORMATS });
          interval = setInterval(async () => {
            if (pausedRef.current || handled.current || !videoRef.current) return;
            try {
              const codes = await detector.detect(videoRef.current);
              if (codes.length) {
                setDetecting(true);
                const value = codes[0]?.rawValue;
                if (value) report(value);
              } else {
                setDetecting(false);
              }
            } catch {
              /* frame not ready */
            }
          }, 350);
          return;
        }

        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const video = videoRef.current;
        if (!video) return;
        zxingControls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } }, audio: false },
          video,
          (result) => {
            if (result) {
              setDetecting(true);
              report(result.getText());
            }
          },
        );
        if (cancelled) return stop();
        setState("scanning");
      } catch (err) {
        const name = (err as { name?: string })?.name ?? "";
        if (name === "NotAllowedError" || name === "SecurityError") setState("denied");
        else if (name === "NotFoundError" || name === "OverconstrainedError")
          setState("unavailable");
        else setState("error");
      }
    };

    void start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [report]);

  const message: Record<ScannerState, string> = {
    starting: "Starting your camera…",
    scanning: detecting ? "Barcode spotted — hold steady" : "Line the barcode up inside the frame",
    denied: "Camera access is blocked. Allow camera in your browser settings, or search instead.",
    unavailable: "We can't find a camera on this device. You can type the barcode or search instead.",
    error: "The camera didn't start. Try again, or search for the product instead.",
  };

  const live = state === "scanning" || state === "starting";

  return (
    <div className="card-soft overflow-hidden p-5">
      <div className="relative grid aspect-4/3 place-items-center overflow-hidden rounded-2xl bg-foreground/90">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          aria-label="Camera preview"
          className={`absolute inset-0 size-full object-cover ${live ? "opacity-100" : "opacity-0"}`}
        />
        <div
          className={`absolute inset-8 rounded-2xl border-2 transition-colors ${
            detecting ? "border-strong" : "border-primary-foreground/60"
          }`}
        />
        {state === "starting" && (
          <div className="relative flex flex-col items-center gap-3 text-primary-foreground">
            <Loader2 className="size-7 animate-spin" aria-hidden />
            <p className="text-sm">{message.starting}</p>
          </div>
        )}
        {(state === "denied" || state === "unavailable" || state === "error") && (
          <div className="relative flex max-w-xs flex-col items-center gap-3 px-6 text-center text-primary-foreground/85">
            <CameraOff className="size-7" aria-hidden />
            <p className="text-sm leading-relaxed">{message[state]}</p>
          </div>
        )}
      </div>

      <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        {state === "scanning" ? (
          <ScanLine className="size-4 shrink-0 text-primary" aria-hidden />
        ) : (
          <Camera className="size-4 shrink-0" aria-hidden />
        )}
        <span aria-live="polite">{message[state]}</span>
      </p>
    </div>
  );
}
