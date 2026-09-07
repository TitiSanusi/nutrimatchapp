import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { GoalId } from "./nutrimatch";

export type Profile = {
  name: string;
  email: string;
  country: string;
  goal: GoalId;
  onboarded: boolean;
};

export type ScanEntry = {
  productId: string;
  goal: GoalId;
  scannedAt: string;
};

const PROFILE_KEY = "nutrimatch.profile.v1";
const HISTORY_KEY = "nutrimatch.history.v1";

const defaultProfile: Profile = {
  name: "",
  email: "",
  country: "United Kingdom",
  goal: "less-sugar",
  onboarded: false,
};

type Ctx = {
  ready: boolean;
  profile: Profile;
  history: ScanEntry[];
  updateProfile: (patch: Partial<Profile>) => void;
  recordScan: (productId: string) => void;
  clearHistory: () => void;
  signOut: () => void;
};

const NutriMatchContext = createContext<Ctx | null>(null);

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function NutriMatchProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [history, setHistory] = useState<ScanEntry[]>([]);

  useEffect(() => {
    setProfile(read(PROFILE_KEY, defaultProfile));
    setHistory(read(HISTORY_KEY, [] as ScanEntry[]));
    setReady(true);
  }, []);

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const recordScan = useCallback((productId: string) => {
    setProfile((prev) => {
      setHistory((old) => {
        const next = [
          { productId, goal: prev.goal, scannedAt: new Date().toISOString() },
          ...old.filter((e) => e.productId !== productId),
        ].slice(0, 25);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
        return next;
      });
      return prev;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(HISTORY_KEY);
    setProfile(defaultProfile);
    setHistory([]);
  }, []);

  const value = useMemo(
    () => ({ ready, profile, history, updateProfile, recordScan, clearHistory, signOut }),
    [ready, profile, history, updateProfile, recordScan, clearHistory, signOut],
  );

  return <NutriMatchContext.Provider value={value}>{children}</NutriMatchContext.Provider>;
}

export function useNutriMatch() {
  const ctx = useContext(NutriMatchContext);
  if (!ctx) throw new Error("useNutriMatch must be used inside NutriMatchProvider");
  return ctx;
}
