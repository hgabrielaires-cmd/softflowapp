import { useEffect } from "react";
import { APP_BUILD_DATE } from "@/lib/app-version";

const STORAGE_KEY = "softflow_build_date";

/**
 * Checks if the app was updated since last visit.
 * If the build date changed, forces a hard reload to bust cache.
 */
export function useVersionCheck() {
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored !== APP_BUILD_DATE) {
      // New version detected — clear cache and reload
      localStorage.setItem(STORAGE_KEY, APP_BUILD_DATE);
      window.location.reload();
      return;
    }
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, APP_BUILD_DATE);
    }
  }, []);
}
