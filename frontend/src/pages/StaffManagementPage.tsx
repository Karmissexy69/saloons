import { useEffect, useMemo, useRef, useState } from "react";
import { Page } from "../components/common/Page";
import { createStaff, listStaff, reEnrollStaffFace } from "../lib/api";
import type { StaffProfileResponse } from "../lib/types";

type Props = { token: string };

const ROLE_OPTIONS = ["STYLIST", "THERAPIST", "FRONT_DESK", "MANAGER"];

type CameraCaptureProps = {
  title: string;
  subtitle: string;
  previewUrl: string;
  onCapture: (blob: Blob) => void;
  onClear: () => void;
};

function CameraCapturePanel({ title, subtitle, previewUrl, onCapture, onClear }: CameraCaptureProps) {
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState("");

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function stopCamera() {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }

  useEffect(() => {
    return () => stopCamera();
  }, []);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to access camera.");
    }
  }

  function capture() {
    setError("");
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current) {
      setError("Start camera first.");
      return;
    }

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("Unable to capture image.");
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Failed to capture image.");
          return;
        }
        onCapture(blob);
      },
      "image/jpeg",
      0.92
    );
  }

  return (
    <section className="st-card">
      <h4>{title}</h4>
      <p>{subtitle}</p>

      <div className="st-camera-shell">
        <video ref={videoRef} autoPlay playsInline muted />
      </div>
      <canvas ref={canvasRef} className="st-hidden" />

      <div className="st-actions">
        <button className="st-btn" type="button" onClick={startCamera}>
          Start Camera
        </button>
        <button className="st-btn st-btn-secondary" type="button" onClick={capture} disabled={!cameraReady}>
          Capture
        </button>
        <button className="st-btn st-btn-secondary" type="button" onClick={stopCamera} disabled={!cameraReady}>
          Stop Camera
        </button>
      </div>

      <div className="st-preview">
        <p>Captured Image</p>
        {previewUrl ? <img src={previewUrl} alt={`${title} capture`} /> : <p>No photo captured yet.</p>}
      </div>

      <div className="st-actions">
        <button className="st-btn st-btn-secondary" type="button" onClick={onClear}>
          Clear Capture
        </button>
      </div>

      {error ? <p className="st-error">{error}</p> : null}
    </section>
  );
}

export function StaffManagementPage({ token }: Props) {
  const [directory, setDirectory] = useState<StaffProfileResponse[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [roleType, setRoleType] = useState("STYLIST");
  const [active, setActive] = useState(true);
  const [enrollmentPhoto, setEnrollmentPhoto] = useState<Blob | null>(null);
  const [enrollmentPreviewUrl, setEnrollmentPreviewUrl] = useState("");

  const [selectedStaff, setSelectedStaff] = useState("");
  const [rePhoto, setRePhoto] = useState<Blob | null>(null);
  const [rePreviewUrl, setRePreviewUrl] = useState("");

  const [notice, setNotice] = useState("Register new staff and maintain Face ID enrollment.");
  const [error, setError] = useState("");

  const selectedStaffProfile = useMemo(
    () => directory.find((staff) => String(staff.id) === selectedStaff),
    [directory, selectedStaff]
  );

  async function refreshDirectory() {
    setLoadingDirectory(true);
    setError("");
    try {
      const data = await listStaff(token);
      setDirectory(data);
      if (!selectedStaff && data.length > 0) {
        setSelectedStaff(String(data[0].id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load staff directory");
    } finally {
      setLoadingDirectory(false);
    }
  }

  useEffect(() => {
    refreshDirectory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    return () => {
      if (enrollmentPreviewUrl) {
        URL.revokeObjectURL(enrollmentPreviewUrl);
      }
      if (rePreviewUrl) {
        URL.revokeObjectURL(rePreviewUrl);
      }
    };
  }, [enrollmentPreviewUrl, rePreviewUrl]);

  function setEnrollmentCapture(blob: Blob) {
    setEnrollmentPhoto(blob);
    const url = URL.createObjectURL(blob);
    setEnrollmentPreviewUrl((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      return url;
    });
  }

  function clearEnrollmentCapture() {
    setEnrollmentPhoto(null);
    setEnrollmentPreviewUrl((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      return "";
    });
  }

  function setReEnrollmentCapture(blob: Blob) {
    setRePhoto(blob);
    const url = URL.createObjectURL(blob);
    setRePreviewUrl((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      return url;
    });
  }

  function clearReEnrollmentCapture() {
    setRePhoto(null);
    setRePreviewUrl((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      return "";
    });
  }

  async function handleCreate() {
    if (!displayName.trim()) {
      setError("Team member name is required.");
      return;
    }
    if (!enrollmentPhoto) {
      setError("Enrollment photo is required.");
      return;
    }

    setError("");
    try {
      const created = await createStaff(token, { displayName: displayName.trim(), roleType, active }, enrollmentPhoto);
      setNotice(`${created.displayName} has been added and enrolled successfully.`);
      setDisplayName("");
      clearEnrollmentCapture();
      await refreshDirectory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team member");
    }
  }

  async function handleReEnroll() {
    if (!selectedStaffProfile) {
      setError("Select a team member to re-enroll.");
      return;
    }
    if (!rePhoto) {
      setError("Please choose a new photo for Face ID re-enrollment.");
      return;
    }

    setError("");
    try {
      await reEnrollStaffFace(token, selectedStaffProfile.id, rePhoto);
      setNotice(`Face ID updated for ${selectedStaffProfile.displayName}.`);
      clearReEnrollmentCapture();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to re-enroll face");
    }
  }

  return (
    <Page title="Staff Directory" subtitle="Manage staff records and biometric enrollment">
      <section className="st-staff-layout">
        <div className="st-staff-table-panel">
          <div className="st-staff-toolbar">
            <h3>Team Members</h3>
            <button className="st-btn st-btn-secondary" onClick={refreshDirectory} disabled={loadingDirectory}>
              {loadingDirectory ? "Refreshing..." : "Refresh Directory"}
            </button>
          </div>

          <div className="st-table-wrap">
            <table className="st-table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {directory.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No team members found.</td>
                  </tr>
                ) : (
                  directory.map((staff) => (
                    <tr key={staff.id}>
                      <td>{staff.displayName}</td>
                      <td>{staff.roleType.replaceAll("_", " ")}</td>
                      <td>
                        <span className={staff.active ? "st-badge st-badge-success" : "st-badge"}>{staff.active ? "ACTIVE" : "INACTIVE"}</span>
                      </td>
                      <td>
                        <button className="st-link-btn" onClick={() => setSelectedStaff(String(staff.id))}>
                          Select
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="st-staff-side-panel">
          <h3>Onboard Curator</h3>
          <p>Register new staff and biometrics.</p>

          <div className="st-grid">
            <label>
              Display Name
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Alexander Pierce" />
            </label>
            <label>
              Role Designation
              <select value={roleType} onChange={(e) => setRoleType(e.target.value)}>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <CameraCapturePanel
            title="Enrollment Face Capture"
            subtitle="Use device camera to capture staff enrollment photo."
            previewUrl={enrollmentPreviewUrl}
            onCapture={setEnrollmentCapture}
            onClear={clearEnrollmentCapture}
          />

          <label className="st-staff-active-toggle">
            <span>Active Status</span>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          </label>

          <button className="st-btn" onClick={handleCreate}>
            Create Profile
          </button>

          <div className="st-divider" />

          <h4>Face Re-enrollment</h4>
          <div className="st-grid">
            <label>
              Team Member
              <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)}>
                <option value="">Select team member</option>
                {directory.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.displayName} ({staff.roleType})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <CameraCapturePanel
            title="Re-enrollment Face Capture"
            subtitle="Capture a fresh face image for selected team member."
            previewUrl={rePreviewUrl}
            onCapture={setReEnrollmentCapture}
            onClear={clearReEnrollmentCapture}
          />

          <button className="st-btn st-btn-secondary" onClick={handleReEnroll}>
            Re-enroll Face ID
          </button>
        </aside>
      </section>

      {error ? <p className="st-error">{error}</p> : <p>{notice}</p>}
    </Page>
  );
}
