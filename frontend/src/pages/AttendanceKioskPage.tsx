import { useEffect, useMemo, useRef, useState } from "react";
import { Page } from "../components/common/Page";
import { clockIn, clockOut, listStaff, verifyFace } from "../lib/api";
import type { AttendanceLogResponse, StaffProfileResponse } from "../lib/types";

type Props = {
  token: string;
  selectedBranchId: number | null;
  selectedBranchName: string;
};
type AttendanceTimes = {
  clockInAt: string | null;
  clockOutAt: string | null;
};

export function AttendanceKioskPage({ token, selectedBranchId, selectedBranchName }: Props) {
  const [staff, setStaff] = useState<StaffProfileResponse[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [attendanceTimesByStaffId, setAttendanceTimesByStaffId] = useState<Record<number, AttendanceTimes>>({});

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
    void startCamera();

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
    if (selectedBranchId === null) {
      setError("Select a branch in the header before clocking in.");
      return;
    }

    setError("");
    try {
      const response = await clockIn(token, selectedStaff.id, selectedBranchId, verificationToken);
      storeAttendanceTimes(selectedStaff.id, response);
      setVerificationToken(null);
      setStatusText(`${selectedStaff.displayName} clocked in at ${formatAttendanceTime(response.clockInAt)}.`);
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
      const response = await clockOut(token, selectedStaff.id, verificationToken);
      storeAttendanceTimes(selectedStaff.id, response);
      setVerificationToken(null);
      setStatusText(`${selectedStaff.displayName} clocked out at ${formatAttendanceTime(response.clockOutAt)}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clock out failed");
    }
  }

  const verificationLabel = similarity === null ? "Waiting for Input" : `Match ${similarity.toFixed(2)}%`;
  const selectedStaffName = selectedStaff?.displayName ?? "Select your name";
  const selectedAttendanceTimes = selectedStaff ? attendanceTimesByStaffId[selectedStaff.id] : undefined;
  const clockInTimeLabel = formatAttendanceTime(selectedAttendanceTimes?.clockInAt ?? null);
  const clockOutTimeLabel = formatAttendanceTime(selectedAttendanceTimes?.clockOutAt ?? null);

  function storeAttendanceTimes(staffId: number, response: AttendanceLogResponse) {
    setAttendanceTimesByStaffId((current) => ({
      ...current,
      [staffId]: {
        clockInAt: response.clockInAt,
        clockOutAt: response.clockOutAt,
      },
    }));
  }

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
                <input value={selectedBranchName || "No branch selected"} disabled />
              </label>
            </div>
            <div className="st-kiosk-shifts">
              <div>
                <span>Clock In Time</span>
                <strong>{clockInTimeLabel}</strong>
              </div>
              <div>
                <span>Clock Out Time</span>
                <strong>{clockOutTimeLabel}</strong>
              </div>
            </div>
          </section>

          <section className="st-kiosk-side-panel">
            <h3 className="st-kiosk-panel-title">Camera Controls</h3>
            <div className="st-actions">
              <button className="st-btn st-btn-secondary" onClick={capture} disabled={!cameraReady}>
                Capture
              </button>
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

function formatAttendanceTime(value: string | null): string {
  if (!value) {
    return "--:--";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "--:--";
  }

  return parsed.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
