import { useMemo, useRef, useState } from "react";
import { clockIn, clockOut, verifyFace } from "../lib/api";
import type { AttendanceLogResponse } from "../lib/types";

type Props = {
  token: string;
  username: string;
  role: string;
  onLogout: () => void;
};

export function CameraClockPanel({ token, username, role, onLogout }: Props) {
  const [staffId, setStaffId] = useState("1");
  const [branchId, setBranchId] = useState("1");
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [startingCamera, setStartingCamera] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const parsedStaffId = Number(staffId);
  const parsedBranchId = Number(branchId);

  const canCapture = !!streamRef.current;
  const canVerify = Number.isFinite(parsedStaffId) && parsedStaffId > 0 && !!selfieBlob && !verifying;
  const canClockIn =
    Number.isFinite(parsedStaffId) &&
    parsedStaffId > 0 &&
    Number.isFinite(parsedBranchId) &&
    parsedBranchId > 0 &&
    !!verificationToken &&
    !clockingIn;
  const canClockOut = Number.isFinite(parsedStaffId) && parsedStaffId > 0 && !!verificationToken && !clockingOut;

  const statusText = useMemo(() => {
    if (error) {
      return { text: error, className: "status error" };
    }
    if (message) {
      return { text: message, className: "status" };
    }
    return null;
  }, [error, message]);

  async function startCamera() {
    setError("");
    setMessage("");
    setStartingCamera(true);

    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "user" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setMessage("Camera ready. Capture a selfie.");
    } catch (err) {
      const text = err instanceof Error ? err.message : "Unable to access camera.";
      setError(`Camera error: ${text}`);
    } finally {
      setStartingCamera(false);
    }
  }

  function stopCamera() {
    if (!streamRef.current) {
      return;
    }

    for (const track of streamRef.current.getTracks()) {
      track.stop();
    }
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function captureFromVideo() {
    setError("");
    setMessage("");

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current) {
      setError("Start camera first.");
      return;
    }

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      setError("Unable to capture image.");
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setError("Failed to capture image.");
        return;
      }
      setSelfie(blob);
    }, "image/jpeg", 0.92);
  }

  function handleFileInput(file: File | null) {
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed.");
      return;
    }
    setSelfie(file);
  }

  function setSelfie(blob: Blob) {
    setSelfieBlob(blob);
    setVerificationToken(null);
    const url = URL.createObjectURL(blob);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setMessage("Selfie ready. Click Verify Face.");
  }

  function resetCapture() {
    setSelfieBlob(null);
    setVerificationToken(null);
    setError("");
    setMessage("");
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
  }

  async function handleVerify() {
    if (!canVerify || !selfieBlob) {
      return;
    }

    setVerifying(true);
    setError("");
    setMessage("Verifying face...");

    try {
      const result = await verifyFace(token, parsedStaffId, selfieBlob);
      if (!result.verified || !result.verificationToken) {
        setVerificationToken(null);
        setError(
          `Verification failed: ${result.failureReason || "UNKNOWN"}${
            result.similarity != null ? ` (similarity: ${result.similarity})` : ""
          }`
        );
        return;
      }

      setVerificationToken(result.verificationToken);
      setMessage(`Verified. similarity=${result.similarity}, threshold=${result.threshold}. Ready for clock action.`);
    } catch (err) {
      const text = err instanceof Error ? err.message : "Verification failed.";
      setError(text);
      setVerificationToken(null);
    } finally {
      setVerifying(false);
    }
  }

  async function handleClockIn() {
    if (!canClockIn || !verificationToken) {
      return;
    }

    setClockingIn(true);
    setError("");
    setMessage("Clocking in...");

    try {
      const response = await clockIn(token, parsedStaffId, parsedBranchId, verificationToken);
      setMessage(formatAttendanceMessage("Clocked in", response));
      setVerificationToken(null);
    } catch (err) {
      const text = err instanceof Error ? err.message : "Clock-in failed.";
      setError(text);
    } finally {
      setClockingIn(false);
    }
  }

  async function handleClockOut() {
    if (!canClockOut || !verificationToken) {
      return;
    }

    setClockingOut(true);
    setError("");
    setMessage("Clocking out...");

    try {
      const response = await clockOut(token, parsedStaffId, verificationToken);
      setMessage(formatAttendanceMessage("Clocked out", response));
      setVerificationToken(null);
    } catch (err) {
      const text = err instanceof Error ? err.message : "Clock-out failed.";
      setError(text);
    } finally {
      setClockingOut(false);
    }
  }

  return (
    <section className="card">
      <div className="row-between">
        <div>
          <h2>Attendance Camera Flow</h2>
          <p className="muted">
            Signed in as {username} ({role})
          </p>
        </div>
        <button className="btn-secondary" onClick={onLogout}>
          Logout
        </button>
      </div>

      <div className="form-grid two-col">
        <label>
          Staff ID
          <input type="number" min={1} value={staffId} onChange={(e) => setStaffId(e.target.value)} />
        </label>
        <label>
          Branch ID
          <input type="number" min={1} value={branchId} onChange={(e) => setBranchId(e.target.value)} />
        </label>
      </div>

      <div className="camera-shell">
        <video ref={videoRef} autoPlay playsInline muted />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {previewUrl ? (
        <div className="preview-shell">
          <p className="muted">Captured selfie</p>
          <img src={previewUrl} alt="Captured selfie" />
        </div>
      ) : null}

      <div className="actions">
        <button onClick={startCamera} disabled={startingCamera}>
          {startingCamera ? "Starting..." : "Start Camera"}
        </button>
        <button onClick={captureFromVideo} disabled={!canCapture}>
          Capture
        </button>
        <button className="btn-secondary" onClick={resetCapture} disabled={!selfieBlob}>
          Retake
        </button>
      </div>

      <div className="actions">
        <label className="file-input">
          <span>Fallback Upload (mobile camera/file)</span>
          <input
            type="file"
            accept="image/*"
            capture="user"
            onChange={(e) => handleFileInput(e.target.files?.[0] || null)}
          />
        </label>
      </div>

      <div className="actions">
        <button onClick={handleVerify} disabled={!canVerify}>
          {verifying ? "Verifying..." : "Verify Face"}
        </button>
        <button onClick={handleClockIn} disabled={!canClockIn}>
          {clockingIn ? "Clocking In..." : "Clock In"}
        </button>
        <button onClick={handleClockOut} disabled={!canClockOut}>
          {clockingOut ? "Clocking Out..." : "Clock Out"}
        </button>
      </div>

      {statusText ? <p className={statusText.className}>{statusText.text}</p> : null}
    </section>
  );
}

function formatAttendanceMessage(prefix: string, response: AttendanceLogResponse): string {
  return `${prefix} successfully.\nAttendance ID: ${response.id}\nStatus: ${response.attendanceStatus}\nClock In: ${
    response.clockInAt || "-"
  }\nClock Out: ${response.clockOutAt || "-"}`;
}
