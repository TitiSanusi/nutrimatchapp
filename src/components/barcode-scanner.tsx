import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Loader2, RefreshCw, ScanLine } from "lucide-react";

type ScannerState = "starting" | "scanning" | "denied" | "unavailable" | "error";

type NativeDetector = {
  detect: (source: HTMLVideoElement | ImageBitmap) => Promise<{ rawValue?: string }[]>;
};

type NativeDetectorCtor = {
  new (opts: { formats: string[] }): NativeDetector;
  getSupportedFormats?: () => Promise<string[]>;
};

const WANTED_NATIVE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf"];

/** UPC/EAN and the common retail 1D fallbacks. */
function zxingHints(lib: typeof import("@zxing/library")) {
  const { BarcodeFormat, DecodeHintType } = lib;
  const hints = new Map<number, unknown>();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.UPC_EAN_EXTENSION,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.ITF,
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);
  return hints;
}

/**
 * Live barcode reader. Uses the browser's built-in detector when it really
 * supports retail formats, otherwise decodes high-resolution camera frames with
 * ZXing (the path iOS Safari takes). Detection is continuous — no photo needed.
 */
export function BarcodeScanner({
  onDetected,
  paused = false,
}: {
  onDetected: (barcode: string) => void;
  paused?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [state, setState] = useState<ScannerState>("starting");
  const [detecting, setDetecting] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const handled = useRef(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const report = useCallback(
    (code: string) => {
      const clean = code.replace(/\D/g, "");
      if (handled.current || pausedRef.current || clean.length < 8) return;
      handled.current = true;
      setDetecting(true);
      onDetected(clean);
    },
    [onDetected],
  );

  useEffect(() => {
    if (!paused) handled.current = false;
  }, [paused]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf: number | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const stop = () => {
      if (raf !== null) cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
      const video = videoRef.current;
      if (video) video.srcObject = null;
    };

    /** Loop that keeps trying to read a barcode until one is found. */
    const runLoop = (tick: () => Promise<void>) => {
      const schedule = () => {
        timer = setTimeout(() => {
          raf = requestAnimationFrame(async () => {
            if (cancelled) return;
            if (!pausedRef.current && !handled.current) {
              try {
                await tick();
              } catch {
                /* frame not decodable — keep scanning */
              }
            }
            if (!cancelled && !handled.current) schedule();
          });
        }, 120);
      };
      schedule();
    };

    const openCamera = async () => {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "environment" },
          // Retail barcodes need detail: ask for the highest practical feed.
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      const track = stream.getVideoTracks()[0];
      try {
        // Continuous autofocus where the browser supports it (Android Chrome).
        await track?.applyConstraints({
          advanced: [{ focusMode: "continuous" }, { zoom: 1 }],
        } as MediaTrackConstraints);
      } catch {
        /* optional */
      }

      const video = videoRef.current;
      if (!video) throw new Error("no video element");
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      await video.play().catch(() => undefined);
      await new Promise<void>((resolve) => {
        if (video.readyState >= 2 && video.videoWidth) return resolve();
        const done = () => resolve();
        video.addEventListener("loadeddata", done, { once: true });
        setTimeout(done, 2500);
      });
      return video;
    };

    const start = async () => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setState("unavailable");
        return;
      }

      try {
        const video = await openCamera();
        if (cancelled) return stop();
        setState("scanning");

        const Ctor = (window as unknown as { BarcodeDetector?: NativeDetectorCtor })
          .BarcodeDetector;
        let native: NativeDetector | null = null;
        if (Ctor) {
          try {
            const supported = (await Ctor.getSupportedFormats?.()) ?? WANTED_NATIVE_FORMATS;
            const formats = WANTED_NATIVE_FORMATS.filter((f) => supported.includes(f));
            // Only trust it when it can read retail codes.
            if (formats.includes("ean_13") || formats.includes("upc_a")) {
              native = new Ctor({ formats });
            }
          } catch {
            native = null;
          }
        }

        console.log("[scan] native?", !!Ctor, !!native);
        if (native) {
          const detector = native;
          runLoop(async () => {
            const codes = await detector.detect(video);
            const value = codes.find((c) => c.rawValue)?.rawValue;
            if (value) report(value);
            else setDetecting(false);
          });
          return;
        }

        console.log("[scan] using zxing path");
        const lib = await import("@zxing/library");
        const reader = new lib.MultiFormatReader();
        reader.setHints(zxingHints(lib) as never);
        if (cancelled) return stop();

        runLoop(async () => {
          const canvas = canvasRef.current;
          console.log("[scan] tick", !!canvas, video.videoWidth, video.videoHeight);
          if (!canvas || !video.videoWidth) return;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) return;

          // Read a wide central band, downscaled to a decode-friendly width.
          const cropW = Math.round(video.videoWidth * 0.9);
          const cropH = Math.round(video.videoHeight * 0.55);
          const sx = Math.round((video.videoWidth - cropW) / 2);
          const sy = Math.round((video.videoHeight - cropH) / 2);
          const targetW = Math.min(1024, cropW);
          const scale = targetW / cropW;
          canvas.width = targetW;
          canvas.height = Math.round(cropH * scale);
          ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height);
          const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

          const luminances = new Uint8ClampedArray(width * height);
          for (let i = 0, p = 0; i < data.length; i += 4, p++) {
            luminances[p] = (data[i]! * 299 + data[i + 1]! * 587 + data[i + 2]! * 114) / 1000;
          }

          const source = new lib.RGBLuminanceSource(luminances, width, height);
          const attempts = [source, source.invert()];
          for (const candidate of attempts) {
            try {
              const bitmap = new lib.BinaryBitmap(new lib.HybridBinarizer(candidate));
              const result = reader.decode(bitmap);
              const text = result?.getText?.();
              if (text) {
                report(text);
                return;
              }
            } catch {
              /* try next candidate */
            } finally {
              reader.reset();
            }
          }
          console.log("[scan] tick no result", canvas.width, canvas.height);
          setDetecting(false);
        });
      } catch (err) {
        console.log("[scan] start error", String(err));
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
  }, [report, attempt]);

  const message: Record<ScannerState, string> = {
    starting: "Starting your camera…",
    scanning: detecting ? "Barcode spotted — hold steady" : "Line the barcode up inside the frame",
    denied: "Camera access is blocked. Allow camera in your browser settings, or search instead.",
    unavailable: "We can't find a camera on this device. You can type the barcode or search instead.",
    error: "The camera didn't start. Try again, or search for the product instead.",
  };

  const live = state === "scanning" || state === "starting";
  const failed = state === "denied" || state === "unavailable" || state === "error";

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
        <canvas ref={canvasRef} className="hidden" aria-hidden />
        <div
          className={`absolute inset-x-6 top-1/2 h-1/3 -translate-y-1/2 rounded-2xl border-2 transition-colors ${
            detecting ? "border-strong" : "border-primary-foreground/60"
          }`}
        />
        {state === "starting" && (
          <div className="relative flex flex-col items-center gap-3 text-primary-foreground">
            <Loader2 className="size-7 animate-spin" aria-hidden />
            <p className="text-sm">{message.starting}</p>
          </div>
        )}
        {failed && (
          <div className="relative flex max-w-xs flex-col items-center gap-3 px-6 text-center text-primary-foreground/85">
            <CameraOff className="size-7" aria-hidden />
            <p className="text-sm leading-relaxed">{message[state]}</p>
            <button
              type="button"
              onClick={() => {
                handled.current = false;
                setState("starting");
                setAttempt((n) => n + 1);
              }}
              className="font-display mt-1 flex items-center gap-2 rounded-xl bg-card px-4 py-2 text-sm font-semibold text-foreground"
            >
              <RefreshCw className="size-4" aria-hidden />
              Try again
            </button>
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
