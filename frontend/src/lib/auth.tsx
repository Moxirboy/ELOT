import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CandidatePortal,
  fetchMe,
  loginDemoAdmin,
  loginDemoLearner,
  loginDemoRole,
  type Candidate,
  type User,
} from "./api";

/**
 * Either side of the demo: either a regular ELOT user (admin / learner) or
 * a Candidate. We keep both in one context so router guards can switch on
 * `role === "candidate"`.
 */
interface AuthContextValue {
  user: User | null;
  candidate: Candidate | null;
  loading: boolean;
  loginAdmin: () => Promise<User>;
  loginLearner: () => Promise<User>;
  loginCandidate: (email: string) => Promise<Candidate>;
  loginCandidateById: (id: number) => Promise<Candidate>;
  loginRole: (
    role: "manager" | "supervisor" | "buddy" | "it",
    employee_id: number,
  ) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function loadStoredUser(): User | null {
  const raw = localStorage.getItem("elot_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function loadStoredCandidate(): Candidate | null {
  const raw = localStorage.getItem("elot_candidate");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Candidate;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadStoredUser);
  const [candidate, setCandidate] = useState<Candidate | null>(loadStoredCandidate);
  const [loading, setLoading] = useState<boolean>(false);

  // Refresh ELOT-user tokens silently on first mount
  useEffect(() => {
    const token = localStorage.getItem("elot_token");
    if (!token || user || candidate) return;
    setLoading(true);
    fetchMe()
      .then((u) => {
        setUser(u);
        localStorage.setItem("elot_user", JSON.stringify(u));
      })
      .catch(() => {
        localStorage.removeItem("elot_token");
        localStorage.removeItem("elot_user");
      })
      .finally(() => setLoading(false));
  }, [user, candidate]);

  const persistUser = useCallback((token: string, u: User) => {
    localStorage.setItem("elot_token", token);
    localStorage.setItem("elot_user", JSON.stringify(u));
    localStorage.removeItem("elot_candidate");
    setUser(u);
    setCandidate(null);
  }, []);

  const persistCandidate = useCallback((token: string, c: Candidate) => {
    localStorage.setItem("elot_token", token);
    localStorage.setItem("elot_candidate", JSON.stringify(c));
    localStorage.removeItem("elot_user");
    setCandidate(c);
    setUser(null);
  }, []);

  const loginAdmin = useCallback(async () => {
    setLoading(true);
    try {
      const { access_token, user: u } = await loginDemoAdmin();
      persistUser(access_token, u);
      return u;
    } finally {
      setLoading(false);
    }
  }, [persistUser]);

  const loginLearner = useCallback(async () => {
    setLoading(true);
    try {
      const { access_token, user: u } = await loginDemoLearner();
      persistUser(access_token, u);
      return u;
    } finally {
      setLoading(false);
    }
  }, [persistUser]);

  const loginRole = useCallback(
    async (
      role: "manager" | "supervisor" | "buddy" | "it",
      employee_id: number,
    ) => {
      setLoading(true);
      try {
        const { access_token, user: u } = await loginDemoRole(role, employee_id);
        persistUser(access_token, u);
        return u;
      } finally {
        setLoading(false);
      }
    },
    [persistUser],
  );

  const loginCandidate = useCallback(
    async (email: string) => {
      setLoading(true);
      try {
        const { access_token, candidate: c } =
          await CandidatePortal.loginByEmail(email);
        persistCandidate(access_token, c);
        return c;
      } finally {
        setLoading(false);
      }
    },
    [persistCandidate],
  );

  const loginCandidateById = useCallback(
    async (id: number) => {
      setLoading(true);
      try {
        const { access_token, candidate: c } = await CandidatePortal.loginById(id);
        persistCandidate(access_token, c);
        return c;
      } finally {
        setLoading(false);
      }
    },
    [persistCandidate],
  );

  const logout = useCallback(() => {
    localStorage.removeItem("elot_token");
    localStorage.removeItem("elot_user");
    localStorage.removeItem("elot_candidate");
    setUser(null);
    setCandidate(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      candidate,
      loading,
      loginAdmin,
      loginLearner,
      loginRole,
      loginCandidate,
      loginCandidateById,
      logout,
    }),
    [
      user,
      candidate,
      loading,
      loginAdmin,
      loginLearner,
      loginRole,
      loginCandidate,
      loginCandidateById,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
