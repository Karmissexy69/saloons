type RouteListener = () => void;

const listeners = new Set<RouteListener>();

export function getCurrentLocation() {
  return `${window.location.pathname}${window.location.search}`;
}

export function navigate(path: string, replace = false) {
  const current = getCurrentLocation();
  if (current === path) {
    return;
  }

  if (replace) {
    window.history.replaceState({}, "", path);
  } else {
    window.history.pushState({}, "", path);
  }

  listeners.forEach((listener) => listener());
}

export function subscribeRoute(listener: RouteListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function installRouteListener() {
  const onPopState = () => listeners.forEach((listener) => listener());
  window.addEventListener("popstate", onPopState);
  return () => window.removeEventListener("popstate", onPopState);
}

export function readSearchParam(name: string) {
  return new URLSearchParams(window.location.search).get(name) ?? "";
}
