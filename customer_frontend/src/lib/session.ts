import { useSyncExternalStore } from "react";
import type { CustomerProfile, StoredSession } from "./types";

const SESSION_KEY = "customer_frontend_session";
const OTP_EMAIL_KEY = "customer_frontend_pending_email";

type Listener = () => void;

const listeners = new Set<Listener>();

function readInitialSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

let sessionCache: StoredSession | null =
  typeof window === "undefined" ? null : readInitialSession();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getSession(): StoredSession | null {
  return sessionCache;
}

export function setSession(next: StoredSession | null) {
  sessionCache = next;
  if (typeof window !== "undefined") {
    if (next) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }
  emit();
}

export function updateSessionCustomer(customer: CustomerProfile) {
  const current = getSession();
  if (!current) {
    return;
  }
  setSession({
    ...current,
    customer,
  });
}

export function subscribeSession(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStoredSession() {
  return useSyncExternalStore(subscribeSession, getSession, getSession);
}

export function savePendingOtpEmail(email: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(OTP_EMAIL_KEY, email);
  }
}

export function getPendingOtpEmail() {
  if (typeof window === "undefined") {
    return "";
  }
  return localStorage.getItem(OTP_EMAIL_KEY) ?? "";
}

export function clearPendingOtpEmail() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(OTP_EMAIL_KEY);
  }
}
