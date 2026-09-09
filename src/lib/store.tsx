import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { goals as allGoals, type GoalId } from "./nutrimatch";

export const MAX_GOALS = 3;

export type Profile = {
  name: string;
  email: string;
  age: number | null;
  country: string;
  /** 1–3 goals, ordered by the user's own priority. */
  goals: GoalId[];
  /** Primary goal — always goals[0]. Kept for features that read a single goal. */
  goal: GoalId;
  avatarPath: string | null;
  avatarUrl: string | null;
  onboarded: boolean;
};

export type ScanEntry = {
  barcode: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  goal: GoalId;
  scannedAt: string;
};

const validGoals = new Set(allGoals.map((g) => g.id as string));

export const defaultProfile: Profile = {
  name: "",
  email: "",
  age: null,
  country: "",
  goals: [],
  goal: "less-sugar",
  avatarPath: null,
  avatarUrl: null,
  onboarded: false,
};

type ProfilePatch = Partial<
  Pick<Profile, "name" | "age" | "country" | "goals" | "onboarded" | "avatarPath">
>;

type Ctx = {
  /** True once the session and (if signed in) the profile have been loaded. */
  ready: boolean;
  session: Session | null;
  profile: Profile;
  history: ScanEntry[];
  saveProfile: (patch: ProfilePatch) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
  removeAvatar: () => Promise<void>;
  recordScan: (entry: {
    barcode: string;
    name: string | null;
    brand: string | null;
    imageUrl: string | null;
  }) => void;
  clearHistory: () => void;
  signOut: () => Promise<void>;
};

const NutriMatchContext = createContext<Ctx | null>(null);

const historyKey = (userId: string) => `nutrimatch.history.${userId}`;

function readHistory(userId: string): ScanEntry[] {
  try {
    const raw = localStorage.getItem(historyKey(userId));
    const parsed = raw ? (JSON.parse(raw) as unknown[]) : [];
    // Drop entries saved before scans were keyed by barcode.
    return (Array.isArray(parsed) ? parsed : []).filter(
      (e): e is ScanEntry =>
        !!e && typeof (e as ScanEntry).barcode === "string" && (e as ScanEntry).barcode.length > 0,
    );
  } catch {
    return [];
  }
}

/** Keeps goals/goal consistent and inside the 1–3 range. */
function normalizeGoals(list: unknown): GoalId[] {
  const arr = (Array.isArray(list) ? list : [])
    .filter((g): g is GoalId => typeof g === "string" && validGoals.has(g))
    .slice(0, MAX_GOALS);
  return arr.length ? arr : [];
}

type Row = {
  name: string | null;
  age: number | null;
  country: string | null;
  goals: string[] | null;
  avatar_path: string | null;
  onboarded: boolean | null;
};

export function NutriMatchProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [history, setHistory] = useState<ScanEntry[]>([]);
  const userId = session?.user.id ?? null;
  const loadedFor = useRef<string | null>(null);

  const toProfile = useCallback(async (row: Row, email: string): Promise<Profile> => {
    const goals = normalizeGoals(row.goals);
    let avatarUrl: string | null = null;
    if (row.avatar_path) {
      const { data } = await supabase.storage
        .from("avatars")
        .createSignedUrl(row.avatar_path, 60 * 60 * 12);
      avatarUrl = data?.signedUrl ?? null;
    }
    return {
      name: row.name ?? "",
      email,
      age: row.age ?? null,
      country: row.country ?? "",
      goals,
      goal: (goals[0] ?? defaultProfile.goal) as GoalId,
      avatarPath: row.avatar_path,
      avatarUrl,
      onboarded: !!row.onboarded,
    };
  }, []);

  const loadProfile = useCallback(
    async (activeSession: Session) => {
      const id = activeSession.user.id;
      const email = activeSession.user.email ?? "";
      const { data } = await supabase
        .from("profiles")
        .select("name, age, country, goals, avatar_path, onboarded")
        .eq("id", id)
        .maybeSingle();

      if (data) {
        setProfile(await toProfile(data as Row, email));
      } else {
        // Row is created by a signup trigger; fall back to an empty profile.
        await supabase.from("profiles").insert({ id, name: "" });
        setProfile({ ...defaultProfile, email });
      }
      setHistory(readHistory(id));
    },
    [toProfile],
  );

  // Session bootstrap + auth changes.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) {
        loadedFor.current = null;
        setProfile(defaultProfile);
        setHistory([]);
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load the signed-in user's profile.
  useEffect(() => {
    if (!session || loadedFor.current === session.user.id) return;
    loadedFor.current = session.user.id;
    setReady(false);
    loadProfile(session).finally(() => setReady(true));
  }, [session, loadProfile]);

  const saveProfile = useCallback(
    async (patch: ProfilePatch) => {
      if (!userId) return;
      const row: {
        name?: string;
        age?: number | null;
        country?: string;
        onboarded?: boolean;
        avatar_path?: string | null;
        goals?: string[];
      } = {};
      if (patch.name !== undefined) row.name = patch.name;
      if (patch.age !== undefined) row.age = patch.age;
      if (patch.country !== undefined) row.country = patch.country;
      if (patch.onboarded !== undefined) row.onboarded = patch.onboarded;
      if (patch.avatarPath !== undefined) row.avatar_path = patch.avatarPath;
      if (patch.goals !== undefined) row.goals = normalizeGoals(patch.goals);

      const { error } = await supabase.from("profiles").update(row).eq("id", userId);
      if (error) throw error;

      setProfile((prev) => {
        const goals = patch.goals ? normalizeGoals(patch.goals) : prev.goals;
        return {
          ...prev,
          ...patch,
          goals: goals.length ? goals : prev.goals,
          goal: (goals[0] ?? prev.goal) as GoalId,
        };
      });
    },
    [userId],
  );

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!userId) throw new Error("Not signed in");
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().slice(0, 5);
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;

      const previous = profile.avatarPath;
      await saveProfile({ avatarPath: path });
      const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 12);
      setProfile((prev) => ({ ...prev, avatarPath: path, avatarUrl: data?.signedUrl ?? null }));
      if (previous && previous !== path) {
        await supabase.storage.from("avatars").remove([previous]);
      }
      return data?.signedUrl ?? "";
    },
    [userId, profile.avatarPath, saveProfile],
  );

  const removeAvatar = useCallback(async () => {
    if (!userId) return;
    const previous = profile.avatarPath;
    await saveProfile({ avatarPath: null });
    setProfile((prev) => ({ ...prev, avatarPath: null, avatarUrl: null }));
    if (previous) await supabase.storage.from("avatars").remove([previous]);
  }, [userId, profile.avatarPath, saveProfile]);

  const recordScan = useCallback(
    (entry: {
      barcode: string;
      name: string | null;
      brand: string | null;
      imageUrl: string | null;
    }) => {
      if (!userId) return;
      setHistory((old) => {
        const next = [
          { ...entry, goal: profile.goal, scannedAt: new Date().toISOString() },
          ...old.filter((e) => e.barcode !== entry.barcode),
        ].slice(0, 25);
        localStorage.setItem(historyKey(userId), JSON.stringify(next));
        return next;
      });
    },
    [userId, profile.goal],
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    if (userId) localStorage.removeItem(historyKey(userId));
  }, [userId]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    loadedFor.current = null;
    setProfile(defaultProfile);
    setHistory([]);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      session,
      profile,
      history,
      saveProfile,
      uploadAvatar,
      removeAvatar,
      recordScan,
      clearHistory,
      signOut,
    }),
    [
      ready,
      session,
      profile,
      history,
      saveProfile,
      uploadAvatar,
      removeAvatar,
      recordScan,
      clearHistory,
      signOut,
    ],
  );

  return <NutriMatchContext.Provider value={value}>{children}</NutriMatchContext.Provider>;
}

export function useNutriMatch() {
  const ctx = useContext(NutriMatchContext);
  if (!ctx) throw new Error("useNutriMatch must be used inside NutriMatchProvider");
  return ctx;
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? "";
}

export function initials(name: string, email: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (email.trim()[0] ?? "N").toUpperCase();
}
