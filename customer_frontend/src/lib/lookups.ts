import { listPublicBranches, listPublicServices, listPublicStaff } from "./api";
import type { PublicBranch, PublicService, PublicStaff } from "./types";

let branchCache: PublicBranch[] | null = null;
let serviceCache: PublicService[] | null = null;
let staffCache: PublicStaff[] | null = null;

export async function loadPublicBranchesCached(force = false) {
  if (!force && branchCache) {
    return branchCache;
  }
  branchCache = await listPublicBranches();
  return branchCache;
}

export async function loadPublicServicesCached(force = false) {
  if (!force && serviceCache) {
    return serviceCache;
  }
  serviceCache = await listPublicServices();
  return serviceCache;
}

export async function loadPublicStaffCached(force = false) {
  if (!force && staffCache) {
    return staffCache;
  }
  staffCache = await listPublicStaff();
  return staffCache;
}

