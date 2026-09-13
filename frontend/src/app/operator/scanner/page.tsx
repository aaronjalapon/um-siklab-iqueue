"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  HelpCircle,
  LoaderCircle,
  QrCode,
  RotateCcw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { verifyBoardingPass } from "@/lib/api";
import { getSavedBoardingPasses } from "@/lib/boarding-passes";
import { glassStyles } from "@/lib/design-system";
import { getSavedGroupBoardingPasses } from "@/lib/group-boarding-passes";
import type { BoardingVerifyResponse } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/*  NOTE: @zxing modules are dynamically loaded on-demand to prevent SSR      */
/*  and hydration failures on mobile devices across local networks.           */
/* -------------------------------------------------------------------------- */

type CameraStatus =
  | "idle"
  | "requesting"
  | "active"
  | "scanned"
  | "denied"
  | "unavailable"
  | "insecure"
  | "error";

const CAMERA_COPY: Record<CameraStatus, string> = {
  idle: "Camera is off. Tap 'Take Photo / Scan Pass' or 'Live Video' when ready.",
  requesting: "Connecting to camera…",
  active: "Camera active. Hold the boarding QR inside the viewfinder.",
  scanned: "QR code captured and verified.",
  denied:
    "Camera permission was blocked. Use the 'Take Photo / Scan Pass' button or demo shortcuts below.",
  unavailable: "Continuous video stream unavailable. Use 'Take Photo / Scan Pass' below.",
  insecure:
    "Mobile browsers require HTTPS for continuous video over Wi-Fi. Use 'Take Photo / Scan Pass' below to scan using your phone camera.",
  error: "Could not open video stream. Use 'Take Photo / Scan Pass' or demo shortcuts below.",
};

function cameraFailureStatus(error: unknown): CameraStatus {
  if (!(error instanceof DOMException)) return "error";
  if (error.name === "NotAllowedError" || error.name === "SecurityError") {
    return "denied";
  }
  if (
    error.name === "NotFoundError" ||
    error.name === "DevicesNotFoundError" ||
    error.name === "OverconstrainedError"
  ) {
    return "unavailable";
  }
  return "error";
}

/* -------------------------------------------------------------------------- */
/*  High-Performance Mobile QR Decoding Pipeline                              */
/* -------------------------------------------------------------------------- */

async function decodeCanvasBitmap(canvas: HTMLCanvasElement): Promise<string | null> {
  try {
    const {
      BarcodeFormat,
      BinaryBitmap,
      DecodeHintType,
      GlobalHistogramBinarizer,
      HybridBinarizer,
      InvertedLuminanceSource,
      MultiFormatReader,
      RGBLuminanceSource,
    } = await import("@zxing/library");

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const rgba = imageData.data;
    const len = canvas.width * canvas.height;
    const rgb32 = new Int32Array(len);

    for (let i = 0; i < len; i++) {
      const offset = i * 4;
      const r = rgba[offset];
      const g = rgba[offset + 1];
      const b = rgba[offset + 2];
      const a = rgba[offset + 3];
      rgb32[i] = (a << 24) | (r << 16) | (g << 8) | b;
    }

    const luminanceSource = new RGBLuminanceSource(rgb32, canvas.width, canvas.height);
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new MultiFormatReader();
    reader.setHints(hints);

    // Pass 1: Standard Hybrid Binarizer
    try {
      const bitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
      const result = reader.decode(bitmap);
      if (result && result.getText()) return result.getText();
    } catch {}

    // Pass 2: Global Histogram Binarizer (for glare / reflections)
    try {
      const bitmap = new BinaryBitmap(new GlobalHistogramBinarizer(luminanceSource));
      const result = reader.decode(bitmap);
      if (result && result.getText()) return result.getText();
    } catch {}

    // Pass 3: Inverted Luminance (for dark-mode QR codes)
    try {
      const invertedSource = new InvertedLuminanceSource(luminanceSource);
      const bitmap = new BinaryBitmap(new HybridBinarizer(invertedSource));
      const result = reader.decode(bitmap);
      if (result && result.getText()) return result.getText();
    } catch {}
  } catch (err) {
    console.warn("Bitmap decode pass error:", err);
  }

  return null;
}

async function decodeQrFromFile(
  file: File,
  setThumb: (url: string) => void
): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });

  setThumb(dataUrl);

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to process image"));
    image.src = dataUrl;
  });

  const { BrowserQRCodeReader } = await import("@zxing/browser");
  const browserReader = new BrowserQRCodeReader();

  // Attempt 1: Direct native element decode
  try {
    const res = await browserReader.decodeFromImageElement(img);
    if (res && res.getText()) return res.getText();
  } catch {}

  // Attempt 2: Multi-resolution canvas binarization passes
  const testResolutions = [800, 1200, 600, 1600, 450];

  for (const maxDim of testResolutions) {
    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;

    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) continue;

    ctx.drawImage(img, 0, 0, width, height);

    // 2a: BrowserQRCodeReader decode from canvas
    try {
      const res = browserReader.decodeFromCanvas(canvas);
      if (res && res.getText()) return res.getText();
    } catch {}

    // 2b: MultiFormatReader 3-pass binarization
    const found = await decodeCanvasBitmap(canvas);
    if (found) return found;
  }

  throw new Error("No QR code detected. Please ensure the QR code is centered and well-lit.");
}

/* -------------------------------------------------------------------------- */
/*  Main Scanner Page Component                                               */
/* -------------------------------------------------------------------------- */

export default function BoardingScannerPage() {
  const [token, setToken] = useState("");
  const [result, setResult] = useState<BoardingVerifyResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "checking" | "error">("idle");
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop(): void } | null>(null);
  const scanLockedRef = useRef(false);
  const cameraSessionRef = useRef(0);

  const [photoScanning, setPhotoScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [capturedThumb, setCapturedThumb] = useState<string | null>(null);
  const resultsRef = useRef<HTMLElement>(null);

  /* ---- Core Verification ---- */
  const verifyToken = useCallback(async (rawToken: string) => {
    const normalizedToken = rawToken.trim();
    if (!normalizedToken) return;

    setToken(normalizedToken);
    setResult(null);
    setStatus("checking");

    try {
      const res = await verifyBoardingPass(normalizedToken);
      setResult(res);
      setStatus("idle");
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    } catch (err) {
      console.error("[verifyToken] API verification error:", err);
      setStatus("error");
    }
  }, []);

  /* ---- Camera Cleanup ---- */
  const releaseCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;

    const stream = videoRef.current?.srcObject;
    if (stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  /* ---- Photo File Capture Handler ---- */
  const handleFileCapture = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setPhotoScanning(true);
      setScanNotice(null);
      setResult(null);

      try {
        const decodedText = await decodeQrFromFile(file, setCapturedThumb);
        setCameraStatus("scanned");
        await verifyToken(decodedText);
      } catch (err) {
        console.warn("QR file decode error:", err);
        setScanNotice(
          "Could not detect a clear QR code. Hold camera steady, closer to the QR code, or use a sample demo pass."
        );
      } finally {
        setPhotoScanning(false);
        event.target.value = "";
      }
    },
    [verifyToken]
  );

  /* ---- Simulate Valid Pass (Live Gate Demo) ---- */
  const loadLatestPass = useCallback(async () => {
    setScanNotice(null);
    setResult(null);
    setStatus("checking");

    try {
      // 1. Fetch active valid signed token from backend API
      const resp = await fetch("/api/v1/boarding/demo-token");
      if (resp.ok) {
        const data = await resp.json();
        if (data.token) {
          setCameraStatus("scanned");
          await verifyToken(data.token);
          return;
        }
      }

      // 2. Check local storage for group pass
      const groupPasses = getSavedGroupBoardingPasses();
      if (groupPasses.length > 0 && groupPasses[0].qr_token) {
        setCameraStatus("scanned");
        await verifyToken(groupPasses[0].qr_token);
        return;
      }

      // 3. Check local storage for individual pass
      const singlePasses = getSavedBoardingPasses();
      if (singlePasses.length > 0 && singlePasses[0].qr_token) {
        setCameraStatus("scanned");
        await verifyToken(singlePasses[0].qr_token);
        return;
      }
    } catch (err) {
      console.error("[loadLatestPass] Demo token fetch error:", err);
    }

    // 4. Fallback verification attempt
    setCameraStatus("scanned");
    await verifyToken("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZWF0IjoiMUEifQ.sample_valid_signature");
  }, [verifyToken]);

  /* ---- Simulate Altered/Tampered Pass ---- */
  const loadTamperedPass = useCallback(async () => {
    setScanNotice(null);
    setResult(null);
    setCameraStatus("scanned");
    await verifyToken("tampered.corrupted_payload.invalid_signature_xyz");
  }, [verifyToken]);

  /* ---- Stop Camera ---- */
  const stopCamera = useCallback(() => {
    cameraSessionRef.current += 1;
    releaseCamera();
    scanLockedRef.current = false;
    setCameraStatus("idle");
  }, [releaseCamera]);

  /* ---- Start Continuous Video Camera ---- */
  const startCamera = useCallback(
    async (deviceId = selectedCameraId) => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        if (typeof window !== "undefined" && !window.isSecureContext) {
          setCameraStatus("insecure");
        } else {
          setCameraStatus("unavailable");
        }
        return;
      }

      releaseCamera();
      const cameraSession = ++cameraSessionRef.current;
      scanLockedRef.current = false;
      setResult(null);
      setStatus("idle");
      setCameraStatus("requesting");

      try {
        const { BrowserQRCodeReader, BrowserCodeReader } = await import("@zxing/browser");

        const reader = new BrowserQRCodeReader(undefined, {
          delayBetweenScanAttempts: 200,
          delayBetweenScanSuccess: 750,
        });

        const controls = await reader.decodeFromVideoDevice(
          deviceId || undefined,
          videoRef.current ?? undefined,
          (decoded, _error, activeControls) => {
            if (cameraSession !== cameraSessionRef.current) {
              activeControls.stop();
              return;
            }
            if (!decoded || scanLockedRef.current) return;

            scanLockedRef.current = true;
            activeControls.stop();
            controlsRef.current = null;
            setCameraStatus("scanned");
            void verifyToken(decoded.getText()).finally(() => {
              scanLockedRef.current = false;
            });
          }
        );

        if (cameraSession !== cameraSessionRef.current) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setCameraStatus("active");

        try {
          const availableCameras = await BrowserCodeReader.listVideoInputDevices();
          setCameras(availableCameras);
          const activeDeviceId =
            videoRef.current?.srcObject instanceof MediaStream
              ? videoRef.current.srcObject.getVideoTracks()[0]?.getSettings().deviceId
              : undefined;
          if (activeDeviceId) setSelectedCameraId(activeDeviceId);
        } catch {
          setCameras([]);
        }
      } catch (error) {
        if (cameraSession !== cameraSessionRef.current) return;
        releaseCamera();
        setCameraStatus(cameraFailureStatus(error));
      }
    },
    [releaseCamera, selectedCameraId, verifyToken]
  );

  /* ---- Cleanup on unmount or tab switch ---- */
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden && controlsRef.current) stopCamera();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      cameraSessionRef.current += 1;
      releaseCamera();
    };
  }, [releaseCamera, stopCamera]);

  /* ---- Manual Form Submit ---- */
  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await verifyToken(token);
  }

  function changeCamera(deviceId: string) {
    setSelectedCameraId(deviceId);
    void startCamera(deviceId);
  }

  const cameraRunning =
    cameraStatus === "requesting" || cameraStatus === "active";

  return (
    <div className={glassStyles.pageContainer}>
      <PageHeader
        eyebrow="Terminal Gate"
        title="Boarding Pass Verification"
        description="Verify HMAC-signed QR boarding passes via phone camera, photo scanner, or live simulation."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <div className={`${glassStyles.panel} space-y-5 p-5`}>
          <section aria-labelledby="camera-scanner-title">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="camera-scanner-title" className="text-lg font-bold text-slate-950 dark:text-white">
                  Gate QR Scanner
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Passenger video remains private on-device; only the HMAC-signed payload is verified.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {/* Take Photo / Scan Pass: OS-level camera intent works on all mobile devices over HTTP/HTTPS */}
                <label
                  className={`${glassStyles.secondaryButton} inline-flex min-h-11 items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95 transition touch-manipulation`}
                >
                  {photoScanning ? (
                    <LoaderCircle className="h-4 w-4 animate-spin text-brand-orange" />
                  ) : (
                    <Camera className="h-4 w-4 text-brand-orange" aria-hidden />
                  )}
                  <span className="font-semibold">{photoScanning ? "Analyzing..." : "Take Photo / Scan Pass"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={handleFileCapture}
                    disabled={photoScanning}
                  />
                </label>

                {cameraRunning ? (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className={`${glassStyles.secondaryButton} inline-flex min-h-11 items-center gap-2 active:scale-95 transition touch-manipulation`}
                  >
                    <CameraOff className="h-4 w-4" aria-hidden />
                    Stop Video
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void startCamera()}
                    className={`${glassStyles.primaryButton} inline-flex min-h-11 items-center gap-2 active:scale-95 transition touch-manipulation`}
                  >
                    {cameraStatus === "scanned" ? (
                      <RotateCcw className="h-4 w-4" aria-hidden />
                    ) : (
                      <Camera className="h-4 w-4" aria-hidden />
                    )}
                    {cameraStatus === "scanned" ? "Scan Another" : "Live Video"}
                  </button>
                )}
              </div>
            </div>

            {/* Viewfinder / Video Container */}
            <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-2xl border border-slate-300 bg-slate-950 dark:border-slate-700 shadow-inner">
              <video
                ref={videoRef}
                className={`h-full w-full object-cover ${cameraStatus === "active" ? "opacity-100" : "opacity-20"}`}
                aria-label="Live camera preview for QR boarding-pass scanning"
                muted
                playsInline
              />

              {cameraStatus === "active" && (
                <div
                  className="pointer-events-none absolute inset-[12%] rounded-2xl border-2 border-white/90 shadow-[0_0_0_999px_rgba(2,6,23,0.45)]"
                  aria-hidden
                >
                  <span className="absolute -left-0.5 -top-0.5 h-10 w-10 rounded-tl-xl border-l-4 border-t-4 border-amber-400" />
                  <span className="absolute -right-0.5 -top-0.5 h-10 w-10 rounded-tr-xl border-r-4 border-t-4 border-amber-400" />
                  <span className="absolute -bottom-0.5 -left-0.5 h-10 w-10 rounded-bl-xl border-b-4 border-l-4 border-amber-400" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-10 w-10 rounded-br-xl border-b-4 border-r-4 border-amber-400" />
                </div>
              )}

              {cameraStatus !== "active" && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white"
                  aria-hidden
                >
                  {cameraStatus === "requesting" ? (
                    <LoaderCircle className="h-10 w-10 animate-spin text-blue-400" aria-hidden />
                  ) : (
                    <QrCode className="h-12 w-12 text-slate-400" aria-hidden />
                  )}
                  <p className="max-w-sm text-sm font-medium text-slate-200">
                    {CAMERA_COPY[cameraStatus]}
                  </p>
                </div>
              )}
            </div>

            {scanNotice && (
              <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                {scanNotice}
              </p>
            )}

            {cameras.length > 1 && (
              <label className="mt-3 block text-xs font-semibold text-slate-700 dark:text-slate-200">
                Switch Camera Lens
                <select
                  value={selectedCameraId}
                  onChange={(event) => changeCamera(event.target.value)}
                  className={`${glassStyles.input} mt-1.5`}
                  disabled={cameraStatus === "requesting"}
                >
                  {cameras.map((camera, index) => (
                    <option key={camera.deviceId} value={camera.deviceId}>
                      {camera.label || `Camera ${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </section>

          {capturedThumb && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
              <img
                src={capturedThumb}
                alt="Captured QR photo thumbnail"
                className="h-14 w-14 rounded-lg object-cover border border-slate-300 dark:border-slate-700 shadow-sm"
              />
              <div className="text-xs text-slate-600 dark:text-slate-300">
                <p className="font-bold">
                  {photoScanning ? "Processing captured photo…" : "Photo analyzed"}
                </p>
                <p className="text-[11px] text-slate-400">
                  Multi-resolution binarization pipeline applied.
                </p>
              </div>
            </div>
          )}

          {/* Quick Demo Shortcuts (Works 100% on Mobile & Laptop) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                Instant Demo Shortcuts
              </p>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Test full cryptographic verification and gate admission in one tap:
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void loadLatestPass()}
                disabled={status === "checking"}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-green-600/15 border border-green-500/40 px-3.5 py-2 text-xs font-bold text-green-800 dark:text-green-300 hover:bg-green-600/25 active:scale-95 transition disabled:opacity-50 touch-manipulation shadow-sm cursor-pointer"
              >
                {status === "checking" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin text-green-700 dark:text-green-300" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                )}
                <span>Simulate Valid Pass (Accept)</span>
              </button>

              <button
                type="button"
                onClick={() => void loadTamperedPass()}
                disabled={status === "checking"}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-red-600/15 border border-red-500/40 px-3.5 py-2 text-xs font-bold text-red-800 dark:text-red-300 hover:bg-red-600/25 active:scale-95 transition disabled:opacity-50 touch-manipulation shadow-sm cursor-pointer"
              >
                {status === "checking" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin text-red-700 dark:text-red-300" />
                ) : (
                  <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
                )}
                <span>Simulate Altered Pass (Reject)</span>
              </button>
            </div>

            {/* Instant In-Place Mobile Feedback Card */}
            {result && (
              <div
                className={`mt-4 rounded-xl border p-3.5 transition-all shadow-sm ${
                  result.valid
                    ? "border-green-300 bg-green-50/90 text-green-900 dark:border-green-800 dark:bg-green-950/60 dark:text-green-200"
                    : "border-red-300 bg-red-50/90 text-red-950 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {result.valid ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                    ) : (
                      <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
                    )}
                    <div>
                      <p className="text-xs font-bold">
                        {result.valid ? "Ready to Board (Verified)" : "Pass Blocked"}
                      </p>
                      <p className="text-[11px] capitalize opacity-80">
                        {result.reason.replaceAll("_", " ")}
                      </p>
                    </div>
                  </div>

                  {result.pass_type === "group" && (
                    <span className="rounded-md bg-blue-600/15 border border-blue-500/30 px-2 py-0.5 text-[11px] font-bold text-blue-800 dark:text-blue-300">
                      Group ({result.members?.length || 0} pax)
                    </span>
                  )}
                  {result.seat && (
                    <span className="rounded-md bg-black/10 dark:bg-white/10 px-2 py-0.5 text-xs font-bold">
                      Seat {result.seat}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3" aria-hidden>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Manual Token Entry
            </span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </div>

          <form onSubmit={verify}>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
              Raw Signed Boarding Token
              <textarea
                value={token}
                onChange={(event) => setToken(event.target.value)}
                className={`${glassStyles.input} mt-1.5 min-h-24 font-mono text-xs`}
                placeholder="Paste the base64 HMAC token here"
                required
              />
            </label>
            <button
              type="submit"
              disabled={status === "checking"}
              className={`${glassStyles.primaryButton} mt-3 inline-flex min-h-10 items-center gap-2 active:scale-95 transition touch-manipulation`}
            >
              <QrCode className="h-4 w-4" aria-hidden />
              {status === "checking" ? "Verifying…" : "Verify Token"}
            </button>

            {status === "error" && (
              <p className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-300" role="alert">
                The verification service could not be reached. Check network connection.
              </p>
            )}
          </form>
        </div>

        {/* Detailed Results Section */}
        <section ref={resultsRef} className={`${glassStyles.panel} p-5`} aria-live="polite">
          {!result ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
              <HelpCircle className="h-10 w-10 opacity-40" />
              <p className="mt-2 text-sm font-medium">Verification results appear here.</p>
              <p className="text-xs text-slate-500">Scan or simulate a pass to inspect cryptographic details.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                className={`flex items-center gap-2.5 rounded-xl p-3 ${
                  result.valid
                    ? "bg-green-50 text-green-900 dark:bg-green-950/40 dark:text-green-200"
                    : "bg-red-50 text-red-950 dark:bg-red-950/40 dark:text-red-200"
                }`}
              >
                {result.valid ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0" />
                ) : (
                  <ShieldAlert className="h-6 w-6 text-red-600 dark:text-red-400 shrink-0" />
                )}
                <div>
                  <h2 className="text-base font-bold">
                    {result.valid
                      ? "Ready to Board"
                      : result.reason === "group_requires_review"
                      ? "Staff Review Required"
                      : "Pass Blocked"}
                  </h2>
                  <p className="text-xs opacity-80 capitalize">
                    {result.reason.replaceAll("_", " ")}
                  </p>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-2.5 rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs dark:border-slate-800 dark:bg-slate-900/40">
                <dt className="text-slate-500 dark:text-slate-400">Status</dt>
                <dd className="font-bold capitalize text-slate-900 dark:text-white">
                  {result.boarding_status || (result.valid ? "Ready" : "Invalid")}
                </dd>

                <dt className="text-slate-500 dark:text-slate-400">Signature</dt>
                <dd className={`font-bold ${result.signature_valid ? "text-green-600" : "text-red-600"}`}>
                  {result.signature_valid ? "HMAC Valid ✓" : "Invalid Signature ✖"}
                </dd>

                <dt className="text-slate-500 dark:text-slate-400">Pass Type</dt>
                <dd className="font-bold capitalize text-slate-900 dark:text-white">
                  {result.pass_type || "Individual"}
                </dd>

                <dt className="text-slate-500 dark:text-slate-400">Seat(s)</dt>
                <dd className="font-bold text-slate-900 dark:text-white">
                  {result.seat || (result.members?.map((m) => m.seat).join(", ") ?? "N/A")}
                </dd>

                <dt className="text-slate-500 dark:text-slate-400">Window</dt>
                <dd className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate">
                  {result.boarding_window ? new Date(result.boarding_window).toLocaleTimeString() : "N/A"}
                </dd>
              </dl>

              {result.pass_type === "group" && result.members && result.members.length > 0 && (
                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Group Member Manifest ({result.members.length} seats)
                  </h3>
                  <ul className="space-y-1.5">
                    {result.members.map((member) => (
                      <li
                        key={member.booking_id}
                        className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs ${
                          member.requires_review
                            ? "border-amber-400 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
                            : "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200"
                        }`}
                      >
                        <span className="font-bold">Seat {member.seat}</span>
                        <span className="capitalize font-medium">
                          {member.status.replaceAll("_", " ")}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {result.reason === "group_requires_review" && (
                    <p className="mt-3 rounded-lg bg-amber-100 p-2.5 text-xs font-semibold text-amber-950 dark:bg-amber-950/60 dark:text-amber-200">
                      ⚠ Do not admit automatically. A missing or cancelled member requires gate review.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
