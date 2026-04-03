const els = {
  loginCard: document.getElementById("login-card"),
  appCard: document.getElementById("app-card"),
  loginForm: document.getElementById("login-form"),
  username: document.getElementById("username"),
  password: document.getElementById("password"),
  loginStatus: document.getElementById("login-status"),
  userMeta: document.getElementById("user-meta"),
  logoutBtn: document.getElementById("logout-btn"),

  staffId: document.getElementById("staff-id"),
  branchId: document.getElementById("branch-id"),
  cameraPreview: document.getElementById("camera-preview"),
  captureCanvas: document.getElementById("capture-canvas"),
  capturedShell: document.getElementById("captured-shell"),
  capturedImage: document.getElementById("captured-image"),

  startCameraBtn: document.getElementById("start-camera-btn"),
  captureBtn: document.getElementById("capture-btn"),
  retakeBtn: document.getElementById("retake-btn"),
  fallbackFile: document.getElementById("fallback-file"),
  verifyBtn: document.getElementById("verify-btn"),
  clockInBtn: document.getElementById("clock-in-btn"),
  clockOutBtn: document.getElementById("clock-out-btn"),

  verifyStatus: document.getElementById("verify-status"),
  clockinStatus: document.getElementById("clockin-status"),
};

const state = {
  token: localStorage.getItem("accessToken") || null,
  username: localStorage.getItem("username") || null,
  role: localStorage.getItem("role") || null,
  stream: null,
  selfieBlob: null,
  verificationToken: null,
};

const API_BASE = window.location.origin;

init();

function init() {
  if (state.token) {
    showApp();
  } else {
    showLogin();
  }

  els.loginForm.addEventListener("submit", handleLogin);
  els.logoutBtn.addEventListener("click", logout);
  els.startCameraBtn.addEventListener("click", startCamera);
  els.captureBtn.addEventListener("click", captureFromVideo);
  els.retakeBtn.addEventListener("click", resetCapture);
  els.verifyBtn.addEventListener("click", verifyFace);
  els.clockInBtn.addEventListener("click", clockIn);
  els.clockOutBtn.addEventListener("click", clockOut);
  els.fallbackFile.addEventListener("change", useFallbackFile);
  els.staffId.addEventListener("input", updateActionStates);
  els.branchId.addEventListener("input", updateActionStates);

  window.addEventListener("beforeunload", stopCamera);
  updateActionStates();
}

function showLogin() {
  els.loginCard.classList.remove("hidden");
  els.appCard.classList.add("hidden");
}

function showApp() {
  els.loginCard.classList.add("hidden");
  els.appCard.classList.remove("hidden");
  els.userMeta.textContent = `Signed in as ${state.username} (${state.role})`;
  updateActionStates();
}

async function handleLogin(event) {
  event.preventDefault();
  setStatus(els.loginStatus, "Logging in...");

  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: els.username.value.trim(),
        password: els.password.value,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Login failed");
    }

    state.token = data.accessToken;
    state.username = data.username;
    state.role = data.role;

    localStorage.setItem("accessToken", state.token);
    localStorage.setItem("username", state.username);
    localStorage.setItem("role", state.role);

    setStatus(els.loginStatus, "Login successful.");
    showApp();
  } catch (err) {
    setStatus(els.loginStatus, `Login error: ${err.message}`, true);
  }
}

function logout() {
  stopCamera();
  localStorage.removeItem("accessToken");
  localStorage.removeItem("username");
  localStorage.removeItem("role");
  state.token = null;
  state.username = null;
  state.role = null;
  resetCapture();
  showLogin();
}

async function startCamera() {
  setStatus(els.verifyStatus, "Requesting camera access...");
  try {
    stopCamera();
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "user" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });
    els.cameraPreview.srcObject = state.stream;
    setStatus(els.verifyStatus, "Camera started. Capture a selfie.");
    updateActionStates();
  } catch (err) {
    setStatus(els.verifyStatus, `Camera error: ${err.message}. Use fallback upload below.`, true);
    updateActionStates();
  }
}

function stopCamera() {
  if (!state.stream) {
    return;
  }
  for (const track of state.stream.getTracks()) {
    track.stop();
  }
  state.stream = null;
  els.cameraPreview.srcObject = null;
  updateActionStates();
}

function captureFromVideo() {
  if (!state.stream) {
    setStatus(els.verifyStatus, "Start camera first.", true);
    return;
  }

  const video = els.cameraPreview;
  const canvas = els.captureCanvas;
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;

  const context = canvas.getContext("2d");
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob((blob) => {
    if (!blob) {
      setStatus(els.verifyStatus, "Failed to capture image.", true);
      return;
    }
    useSelfieBlob(blob);
  }, "image/jpeg", 0.92);
}

function useFallbackFile(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  useSelfieBlob(file);
}

function useSelfieBlob(blob) {
  if (!blob.type.startsWith("image/")) {
    setStatus(els.verifyStatus, "Please provide an image file.", true);
    return;
  }

  state.selfieBlob = blob;
  state.verificationToken = null;

  const objectUrl = URL.createObjectURL(blob);
  els.capturedImage.src = objectUrl;
  els.capturedShell.classList.remove("hidden");
  els.verifyBtn.disabled = false;
  els.retakeBtn.disabled = false;

  setStatus(els.verifyStatus, "Selfie ready. Click Verify Face.");
  updateActionStates();
}

function resetCapture() {
  state.selfieBlob = null;
  state.verificationToken = null;
  els.fallbackFile.value = "";
  els.capturedImage.src = "";
  els.capturedShell.classList.add("hidden");
  updateActionStates();
}

async function verifyFace() {
  const staffId = Number(els.staffId.value);
  if (!staffId || !state.selfieBlob) {
    setStatus(els.verifyStatus, "Enter Staff ID and capture selfie first.", true);
    return;
  }

  const formData = new FormData();
  formData.append("selfie", state.selfieBlob, "selfie.jpg");

  setStatus(els.verifyStatus, "Verifying face...");

  try {
    const response = await fetch(`${API_BASE}/api/attendance/verify-face?staffId=${staffId}`, {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Verification failed");
    }

    if (!data.verified) {
      setStatus(
        els.verifyStatus,
        `Verification failed: ${data.failureReason || "UNKNOWN"}${data.similarity ? ` (similarity: ${data.similarity})` : ""}`,
        true
      );
      state.verificationToken = null;
      updateActionStates();
      return;
    }

    state.verificationToken = data.verificationToken;
    updateActionStates();
    setStatus(
      els.verifyStatus,
      `Verified (similarity: ${data.similarity}, threshold: ${data.threshold}). You can now clock in.`
    );
  } catch (err) {
    setStatus(els.verifyStatus, `Verify error: ${err.message}`, true);
    state.verificationToken = null;
    updateActionStates();
  }
}

async function clockIn() {
  const staffId = Number(els.staffId.value);
  const branchId = Number(els.branchId.value);

  if (!staffId || !branchId || !state.verificationToken) {
    setStatus(els.clockinStatus, "Need Staff ID, Branch ID, and successful face verification.", true);
    return;
  }

  setStatus(els.clockinStatus, "Submitting clock-in...");

  try {
    const response = await fetch(`${API_BASE}/api/attendance/clock-in`, {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        staffId,
        branchId,
        verificationToken: state.verificationToken,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Clock-in failed");
    }

    setStatus(
      els.clockinStatus,
      `Clocked in successfully.\nAttendance ID: ${data.id}\nClock-in: ${data.clockInAt}\nStatus: ${data.attendanceStatus}`
    );
    state.verificationToken = null;
    updateActionStates();
  } catch (err) {
    setStatus(els.clockinStatus, `Clock-in error: ${err.message}`, true);
  }
}

async function clockOut() {
  const staffId = Number(els.staffId.value);

  if (!staffId || !state.verificationToken) {
    setStatus(els.clockinStatus, "Need Staff ID and successful face verification.", true);
    return;
  }

  setStatus(els.clockinStatus, "Submitting clock-out...");

  try {
    const response = await fetch(`${API_BASE}/api/attendance/clock-out`, {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        staffId,
        verificationToken: state.verificationToken,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Clock-out failed");
    }

    setStatus(
      els.clockinStatus,
      `Clocked out successfully.\nAttendance ID: ${data.id}\nClock-out: ${data.clockOutAt}\nStatus: ${data.attendanceStatus}`
    );
    state.verificationToken = null;
    updateActionStates();
  } catch (err) {
    setStatus(els.clockinStatus, `Clock-out error: ${err.message}`, true);
  }
}

function updateActionStates() {
  const hasStaffId = Number.isFinite(Number(els.staffId.value)) && Number(els.staffId.value) > 0;
  const hasBranchId = Number.isFinite(Number(els.branchId.value)) && Number(els.branchId.value) > 0;
  const hasSelfie = !!state.selfieBlob;
  const hasToken = !!state.verificationToken;
  const cameraReady = !!state.stream;

  els.captureBtn.disabled = !cameraReady;
  els.retakeBtn.disabled = !hasSelfie;
  els.verifyBtn.disabled = !(hasStaffId && hasSelfie);
  els.clockInBtn.disabled = !(hasStaffId && hasBranchId && hasToken);
  els.clockOutBtn.disabled = !(hasStaffId && hasToken);
}

function authHeaders() {
  if (!state.token) {
    return {};
  }
  return { Authorization: `Bearer ${state.token}` };
}

function setStatus(element, message, isError = false) {
  element.textContent = message;
  element.style.color = isError ? "var(--danger)" : "var(--text)";
}
