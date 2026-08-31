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
  LoaderCircle,
  QrCode,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import {
  BrowserCodeReader,
  BrowserQRCodeReader,
  type IScannerControls,
} from "@zxing/browser";
import { PageHeader } from "@/components/ui/PageHeader";
import { verifyBoardingPass } from "@/lib/api";
import { glassStyles } from "@/lib/design-system";
import type { BoardingVerifyResponse } from "@/lib/types";

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
  idle: "Camera is off. Start it when the passenger presents a QR pass.",
  requesting: "Waiting for camera permission…",
  active: "Camera active. Hold the boarding QR inside the frame.",
  scanned: "QR captured. The camera stopped while TripSync checks the pass.",
  denied:
    "Camera access was blocked. Allow camera access in the browser, then try again—or paste the token below.",
  unavailable: "No usable camera was found on this device. Paste the token below.",
  insecure:
    "Camera scanning requires a secure connection (HTTPS or localhost). Paste the token below.",
  error: "TripSync could not start this camera. Select another camera or paste the token below.",
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

export default function BoardingScannerPage() {
  const [token, setToken] = useState("");
  const [result, setResult] = useState<BoardingVerifyResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "checking" | "error">("idle");
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const scanLockedRef = useRef(false);
  const cameraSessionRef = useRef(0);

  const releaseCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;

    const stream = videoRef.current?.srcObject;
    if (stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const verifyToken = useCallback(async (rawToken: string) => {
    const normalizedToken = rawToken.trim();
    if (!normalizedToken) return;

    setToken(normalizedToken);
    setResult(null);
    setStatus("checking");
    try {
      setResult(await verifyBoardingPass(normalizedToken));
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }, []);

  const stopCamera = useCallback(() => {
    cameraSessionRef.current += 1;
    releaseCamera();
    scanLockedRef.current = false;
    setCameraStatus("idle");
  }, [releaseCamera]);

  const startCamera = useCallback(
    async (deviceId = selectedCameraId) => {
      if (!window.isSecureContext) {
        setCameraStatus("insecure");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraStatus("unavailable");
        return;
      }

      releaseCamera();
      const cameraSession = ++cameraSessionRef.current;
      scanLockedRef.current = false;
      setResult(null);
      setStatus("idle");
      setCameraStatus("requesting");

      try {
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
        eyebrow="Terminal gate"
        title="Boarding Pass Verification"
        description="Scan a TripSync QR pass with this device’s camera, then verify its signature, booking state, and boarding window online."
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
        <div className={`${glassStyles.panel} space-y-5 p-5`}>
          <section aria-labelledby="camera-scanner-title">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="camera-scanner-title" className="text-lg font-bold text-slate-950 dark:text-white">
                  Camera QR scanner
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  The video stays on this device; only the decoded signed token is sent for verification.
                </p>
              </div>
              {cameraRunning ? (
                <button
                  type="button"
                  onClick={stopCamera}
                  className={`${glassStyles.secondaryButton} inline-flex min-h-11 items-center gap-2`}
                >
                  <CameraOff className="h-4 w-4" aria-hidden />
                  Stop camera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void startCamera()}
                  className={`${glassStyles.primaryButton} inline-flex min-h-11 items-center gap-2`}
                >
                  {cameraStatus === "scanned" ? (
                    <RotateCcw className="h-4 w-4" aria-hidden />
                  ) : (
                    <Camera className="h-4 w-4" aria-hidden />
                  )}
                  {cameraStatus === "scanned" ? "Scan another pass" : "Start camera"}
                </button>
              )}
            </div>

            <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-2xl border border-slate-300 bg-slate-950 dark:border-slate-700">
              <video
                ref={videoRef}
                className={`h-full w-full object-cover ${cameraStatus === "active" ? "opacity-100" : "opacity-30"}`}
                aria-label="Live camera preview for QR boarding-pass scanning"
                muted
                playsInline
              />
              {cameraStatus === "active" && (
                <div className="pointer-events-none absolute inset-[13%] rounded-2xl border-2 border-white/90 shadow-[0_0_0_999px_rgba(2,6,23,0.36)]" aria-hidden>
                  <span className="absolute -left-0.5 -top-0.5 h-10 w-10 rounded-tl-xl border-l-4 border-t-4 border-amber-400" />
                  <span className="absolute -right-0.5 -top-0.5 h-10 w-10 rounded-tr-xl border-r-4 border-t-4 border-amber-400" />
                  <span className="absolute -bottom-0.5 -left-0.5 h-10 w-10 rounded-bl-xl border-b-4 border-l-4 border-amber-400" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-10 w-10 rounded-br-xl border-b-4 border-r-4 border-amber-400" />
                </div>
              )}
              {cameraStatus !== "active" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white" aria-hidden>
                  {cameraStatus === "requesting" ? (
                    <LoaderCircle className="h-10 w-10 animate-spin text-blue-300" aria-hidden />
                  ) : (
                    <QrCode className="h-12 w-12 text-slate-400" aria-hidden />
                  )}
                  <p className="max-w-sm text-sm font-medium">{CAMERA_COPY[cameraStatus]}</p>
                </div>
              )}
            </div>

            <p
              className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
                cameraStatus === "active"
                  ? "border-green-300 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200"
                  : cameraStatus === "denied" || cameraStatus === "error" || cameraStatus === "insecure"
                    ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                    : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
              }`}
              role="status"
              aria-live="polite"
            >
              {CAMERA_COPY[cameraStatus]}
            </p>

            {cameras.length > 1 && (
              <label className="mt-3 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Camera
                <select
                  value={selectedCameraId}
                  onChange={(event) => changeCamera(event.target.value)}
                  className={`${glassStyles.input} mt-2`}
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

          <div className="flex items-center gap-3" aria-hidden>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Manual fallback</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </div>

          <form onSubmit={verify}>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              QR token
              <textarea
                value={token}
                onChange={(event) => setToken(event.target.value)}
                className={`${glassStyles.input} mt-2 min-h-32 font-mono text-xs`}
                placeholder="Paste the signed boarding token"
                required
              />
            </label>
            <button
              type="submit"
              disabled={status === "checking"}
              className={`${glassStyles.primaryButton} mt-4 inline-flex items-center gap-2`}
            >
              <QrCode className="h-4 w-4" aria-hidden />
              {status === "checking" ? "Verifying" : "Verify Pass"}
            </button>
            {status === "error" && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                The verification service is unavailable. The token remains available to retry.
              </p>
            )}
          </form>
        </div>

        <section className={`${glassStyles.panel} p-5`} aria-live="polite">
          {!result ? (
            <p className="text-sm text-slate-500">Verification results appear here.</p>
          ) : (
            <div className="space-y-4">
              <div className={`flex items-center gap-2 ${result.valid ? "text-green-700" : "text-red-700"}`}>
                {result.valid ? <CheckCircle2 className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
                <h2 className="text-lg font-semibold">{result.valid ? "Ready to board" : result.reason === "group_requires_review" ? "Staff review required" : "Pass blocked"}</h2>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <dt className="text-slate-500">Reason</dt><dd className="font-medium capitalize">{result.reason.replaceAll("_", " ")}</dd>
                <dt className="text-slate-500">Seat</dt><dd className="font-medium">{result.seat ?? "Unknown"}</dd>
                <dt className="text-slate-500">Signature</dt><dd className="font-medium">{result.signature_valid ? "Valid" : "Invalid"}</dd>
                <dt className="text-slate-500">Window</dt><dd className="break-all font-medium">{result.boarding_window ?? "Unknown"}</dd>
                <dt className="text-slate-500">Pass type</dt><dd className="font-medium capitalize">{result.pass_type || "individual"}</dd>
              </dl>
              {result.pass_type === "group" && result.members.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-bold">Group member statuses</h3>
                  <ul className="space-y-2">
                    {result.members.map((member) => (
                      <li key={member.booking_id} className={`flex items-center justify-between rounded-lg border p-2 text-xs ${member.requires_review ? "border-amber-400 bg-amber-50 text-amber-950" : "border-green-200 bg-green-50 text-green-900"}`}>
                        <span>Seat {member.seat}</span><span className="font-bold capitalize">{member.status.replaceAll("_", " ")}</span>
                      </li>
                    ))}
                  </ul>
                  {result.reason === "group_requires_review" && <p className="mt-3 rounded-lg bg-amber-100 p-3 text-xs font-semibold text-amber-950">Do not admit automatically. A missing, cancelled, missed, or mismatched member needs a staff decision.</p>}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
