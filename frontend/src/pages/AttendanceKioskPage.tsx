import { useEffect, useMemo, useRef, useState } from "react";
import { Page } from "../components/common/Page";
import { clockIn, clockOut, listStaff, verifyFace } from "../lib/api";
import type { StaffProfileResponse } from "../lib/types";

type Props = { token: string };

export function AttendanceKioskPage({ token }: Props) {
  const [staff, setStaff] = useState<StaffProfileResponse[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");

  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [statusText, setStatusText] = useState("Please select your profile and align your face to verify.");
  const [error, setError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const selectedStaff = useMemo(
    () => staff.find((item) => String(item.id) === selectedStaffId) || null,
    [staff, selectedStaffId]
  );

  const canVerify = selectedStaff !== null && selfieBlob !== null;
  const canClock = selectedStaff !== null && verificationToken !== null;

  useEffect(() => {
    async function loadStaff() {
      try {
        const data = await listStaff(token);
        const activeOnly = data.filter((item) => item.active);
        setStaff(activeOnly);
        if (activeOnly.length > 0) {
          setSelectedStaffId(String(activeOnly[0].id));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load team list");
      }
    }

    loadStaff();

    return () => {
      stopCamera();
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
    // previewUrl intentionally omitted; cleanup is only for unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function startCamera() {
    setError("");
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
      setCameraReady(true);
      setStatusText("Camera is live. Capture your photo to continue.");
    } catch (err) {
      setCameraReady(false);
      setError(err instanceof Error ? err.message : "Unable to start camera");
    }
  }

  function stopCamera() {
    if (streamRef.current === null) {
      return;
    }

    for (const track of streamRef.current.getTracks()) {
      track.stop();
    }
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraReady(false);
  }

  function setSelfie(blob: Blob) {
    setSelfieBlob(blob);
    setVerificationToken(null);
    setSimilarity(null);

    const url = URL.createObjectURL(blob);
    setPreviewUrl((old) => {
      if (old) {
        URL.revokeObjectURL(old);
      }
      return url;
    });

    setStatusText("Photo captured. Run face verification.");
  }

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video === null || canvas === null || streamRef.current === null) {
      setError("Start camera before capturing.");
      return;
    }

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx === null) {
      setError("Capture failed.");
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob === null) {
          setError("Capture failed.");
          return;
        }
        setSelfie(blob);
      },
      "image/jpeg",
      0.92
    );
  }

  async function handleVerify() {
    if (selectedStaff === null || selfieBlob === null) {
      return;
    }

    setError("");
    try {
      const data = await verifyFace(token, selectedStaff.id, selfieBlob);
      setVerificationToken(data.verificationToken || null);
      setSimilarity(data.similarity || null);

      if (data.verified) {
        setStatusText(`Verified for ${selectedStaff.displayName}. You may now clock in or clock out.`);
      } else {
        setStatusText(`Verification failed${data.failureReason ? `: ${data.failureReason}` : "."}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Face verification failed");
    }
  }

  async function handleClockIn() {
    if (selectedStaff === null || verificationToken === null) {
      return;
    }

    setError("");
    try {
      await clockIn(token, selectedStaff.id, 1, verificationToken);
      setVerificationToken(null);
      setStatusText(`${selectedStaff.displayName} has clocked in successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clock in failed");
    }
  }

  async function handleClockOut() {
    if (selectedStaff === null || verificationToken === null) {
      return;
    }

    setError("");
    try {
      await clockOut(token, selectedStaff.id, verificationToken);
      setVerificationToken(null);
      setStatusText(`${selectedStaff.displayName} has clocked out successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clock out failed");
    }
  }

  const verificationLabel = similarity === null ? "Waiting for Input" : `Match ${similarity.toFixed(2)}%`;
  const selectedStaffName = selectedStaff?.displayName ?? "Select your name";

  return (
    <Page title="Staff Attendance Terminal" subtitle="Please select your name and align your face with the viewfinder.">
      <div className="st-kiosk-grid">
        <div className="st-kiosk-left">
          <section className="st-kiosk-panel">
            <div className="st-kiosk-camera-shell">
              <video ref={videoRef} autoPlay playsInline muted />
              <canvas ref={canvasRef} className="st-hidden" />
              <div className="st-kiosk-mask" />
              <div className="st-kiosk-guide-ring" />
              <div className="st-kiosk-live-chips">
                <p className="st-kiosk-chip">
                  <span className="st-kiosk-dot" />
                  System Live
                </p>
                <p className="st-kiosk-chip">ISO 400 | F2.8</p>
              </div>
            </div>

            <div className="st-kiosk-status-row">
              <div className="st-kiosk-status-block">
                <div className="st-kiosk-status-icon">
                  <span className="material-symbols-outlined">face_unlock</span>
                </div>
                <div>
                  <p className="st-kiosk-status-title">Verification Status</p>
                  <p className={verificationToken ? "st-kiosk-status-ok" : "st-kiosk-status-wait"}>{verificationLabel}</p>
                </div>
              </div>
              <button className="st-btn" onClick={handleVerify} disabled={!canVerify}>
                Verify Face
              </button>
            </div>
          </section>

          <div className="st-kiosk-bottom-grid">
            <section className="st-kiosk-preview-card">
              <p className="st-kiosk-section-label">Captured Preview</p>
              <div className="st-kiosk-preview-panel">
                {previewUrl ? <img src={previewUrl} alt="Captured selfie" /> : <p>No captured photo yet.</p>}
              </div>
            </section>

            <section className="st-kiosk-ready-card">
              <h3>Ready to Clock?</h3>
              <p>Once face verification is confirmed, terminal action buttons are unlocked for secure attendance logging.</p>
            </section>
          </div>
        </div>

        <div className="st-kiosk-right">
          <section className="st-kiosk-side-panel">
            <h3 className="st-kiosk-panel-title">Staff Authentication</h3>
            <div className="st-grid">
              <label>
                Team Member
                <select value={selectedStaffId} onChange={(e) => setSelectedStaffId(e.target.value)}>
                  <option value="">Select your name</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Branch
                <input value="Downtown Branch" disabled />
              </label>
            </div>
            <div className="st-kiosk-shifts">
              <div>
                <span>Shift Start</span>
                <strong>08:00 AM</strong>
              </div>
              <div>
                <span>Shift End</span>
                <strong>05:00 PM</strong>
              </div>
            </div>
          </section>

          <section className="st-kiosk-side-panel">
            <h3 className="st-kiosk-panel-title">Camera Controls</h3>
            <div className="st-actions">
              <button className="st-btn" onClick={startCamera}>
                Start Camera
              </button>
              <button className="st-btn st-btn-secondary" onClick={capture} disabled={!cameraReady}>
                Capture
              </button>
              <label className="st-upload">
                Upload Instead
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelfie(file);
                    }
                  }}
                />
              </label>
            </div>
          </section>

          <section className="st-kiosk-side-panel">
            <h3 className="st-kiosk-panel-title">Terminal Actions</h3>
            <div className="st-actions st-kiosk-actions">
              <button className="st-btn" onClick={handleClockIn} disabled={!canClock}>
                Clock In
              </button>
              <button className="st-btn" onClick={handleClockOut} disabled={!canClock}>
                Clock Out
              </button>
            </div>
          </section>

          <section className="st-kiosk-side-panel st-kiosk-message-panel">
            <h3 className="st-kiosk-panel-title">Attendance Status</h3>
            <p className="st-kiosk-member">Current selection: {selectedStaffName}</p>
            {error ? <p className="st-error">{error}</p> : <p>{statusText}</p>}
          </section>
        </div>
      </div>
    </Page>
  );
}
