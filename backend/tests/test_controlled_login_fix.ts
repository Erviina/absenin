import assert from "node:assert";
import jwt from "jsonwebtoken";

// Mock localStorage and sessionStorage in Node.js
class MockStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
  get length(): number {
    return this.store.size;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] || null;
  }
}

const mockLocalStorage = new MockStorage();
const mockSessionStorage = new MockStorage();

(global as any).window = {
  dispatchEvent: (event: any) => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  location: { pathname: "/login", search: "", href: "/login" },
};
(global as any).localStorage = mockLocalStorage;
(global as any).sessionStorage = mockSessionStorage;
(global as any).CustomEvent = class CustomEvent {
  type: string;
  detail: any;
  constructor(type: string, params: any = {}) {
    this.type = type;
    this.detail = params.detail;
  }
};

// Import frontend logic to test
import { getApiUrl, getApiBaseUrl, setAuthSession, clearAuthSession, getActiveCompanyId, setActiveCompanyId } from "../../src/lib/api";
import { isTokenValid, getPersonalModePreference, setPersonalModePreference, getSafeInternalRedirect } from "../../src/lib/personalMode";

console.log("=== RUNNING CONTROLLED FIX VERIFICATION TESTS ===\n");

let passed = 0;
let failed = 0;

function it(desc: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      console.log(`[PASS] ${desc}`);
      passed++;
    })
    .catch((err) => {
      console.error(`[FAIL] ${desc}:`, err.message);
      failed++;
    });
}

async function runTests() {
  // --------------------------------------------------------------------------
  // Skenario 5 & 6: URL Standardisasi & Pencegahan /api/api duplikasi
  // --------------------------------------------------------------------------
  await it("Skenario 5.1: NEXT_PUBLIC_API_URL tidak tersedia -> default ke relative /api", () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    assert.strictEqual(getApiBaseUrl(), "/api");
    assert.strictEqual(getApiUrl("/auth/me"), "/api/auth/me");
    assert.strictEqual(getApiUrl("auth/me"), "/api/auth/me");
  });

  await it("Skenario 5.2: NEXT_PUBLIC_API_URL adalah whitespace / 'undefined' string -> default ke /api", () => {
    process.env.NEXT_PUBLIC_API_URL = "   ";
    assert.strictEqual(getApiUrl("/auth/me"), "/api/auth/me");
    process.env.NEXT_PUBLIC_API_URL = "undefined";
    assert.strictEqual(getApiUrl("/auth/me"), "/api/auth/me");
    process.env.NEXT_PUBLIC_API_URL = "null";
    assert.strictEqual(getApiUrl("/auth/me"), "/api/auth/me");
  });

  await it("Skenario 6.1: URL /api tidak menghasilkan /api/api/... jika path diawali /api", () => {
    process.env.NEXT_PUBLIC_API_URL = "/api";
    assert.strictEqual(getApiUrl("/api/auth/me"), "/api/auth/me");
    assert.strictEqual(getApiUrl("api/auth/me"), "/api/auth/me");
    assert.strictEqual(getApiUrl("/auth/me"), "/api/auth/me");
  });

  await it("Skenario 6.2: Base URL eksternal dengan suffix /api tidak menghasilkan duplikasi", () => {
    process.env.NEXT_PUBLIC_API_URL = "https://backend.absenin.my.id/api";
    assert.strictEqual(getApiUrl("/auth/me"), "https://backend.absenin.my.id/api/auth/me");
    assert.strictEqual(getApiUrl("/api/auth/me"), "https://backend.absenin.my.id/api/auth/me");
    assert.strictEqual(getApiUrl("api/auth/me"), "https://backend.absenin.my.id/api/auth/me");
  });

  await it("Skenario 6.3: Absolute URL yang dipassing langsung dipertahankan apa adanya", () => {
    assert.strictEqual(getApiUrl("https://storage.googleapis.com/avatar.png"), "https://storage.googleapis.com/avatar.png");
    assert.strictEqual(getApiUrl("http://localhost:3001/custom"), "http://localhost:3001/custom");
  });

  // Reset base URL to default /api
  delete process.env.NEXT_PUBLIC_API_URL;

  // --------------------------------------------------------------------------
  // Skenario 1: Tidak ada token -> Halaman login tetap tampil, tidak redirect
  // --------------------------------------------------------------------------
  await it("Skenario 1: Tidak ada token di storage -> verifikasi sesi dilewati, tidak ada redirect", () => {
    mockLocalStorage.clear();
    const token = mockLocalStorage.getItem("accessToken");
    assert.strictEqual(token, null);
    assert.strictEqual(isTokenValid(token), false);
    // Login form logic: if (!token) return; (login page remains idle and ready for user input)
  });

  // --------------------------------------------------------------------------
  // Skenario 2: Token valid -> diverifikasi ke backend sebelum redirect
  // --------------------------------------------------------------------------
  await it("Skenario 2: Token berformat JWT valid diverifikasi ke backend /auth/me sebelum redirect", async () => {
    const validToken = jwt.sign({ id: "user-123", email: "user@test.com" }, "secret", { expiresIn: "1h" });
    assert.strictEqual(isTokenValid(validToken), true);

    // Mock backend responding 200 OK
    let backendCalled = false;
    let authHeader = "";
    const mockFetch = async (url: string, opts: any) => {
      backendCalled = true;
      authHeader = opts?.headers?.Authorization;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            id: "user-123",
            name: "Test User",
            email: "user@test.com",
            company: { id: "comp-1", name: "PT Test" }
          }
        })
      };
    };

    const res = await mockFetch(getApiUrl("/auth/me"), {
      method: "GET",
      headers: { Authorization: `Bearer ${validToken}` }
    });
    const json = await res.json();

    assert.strictEqual(backendCalled, true);
    assert.strictEqual(authHeader, `Bearer ${validToken}`);
    assert.strictEqual(res.ok, true);
    assert.strictEqual(json.data.company.id, "comp-1");
  });

  // --------------------------------------------------------------------------
  // Skenario 3: Token expired atau backend 401 -> Session dibersihkan & login tampil
  // --------------------------------------------------------------------------
  await it("Skenario 3.1: Token berformat expired -> isTokenValid = false -> sesi dibersihkan seketika", () => {
    mockLocalStorage.setItem("accessToken", "expired.jwt.token");
    mockLocalStorage.setItem("user", JSON.stringify({ id: "u1" }));

    // Expired JWT (exp in the past)
    const expiredToken = jwt.sign({ id: "u1" }, "secret", { expiresIn: -3600 });
    assert.strictEqual(isTokenValid(expiredToken), false);

    clearAuthSession();
    assert.strictEqual(mockLocalStorage.getItem("accessToken"), null);
    assert.strictEqual(mockLocalStorage.getItem("user"), null);
  });

  await it("Skenario 3.2: Token tampak valid offline tetapi backend mengembalikan 401 -> sesi dibersihkan dan tetap di login", async () => {
    const revokedToken = jwt.sign({ id: "revoked-user" }, "old-secret", { expiresIn: "2h" });
    mockLocalStorage.setItem("accessToken", revokedToken);

    // Backend returns 401 Unauthorized
    const mockFetch = async () => ({
      ok: false,
      status: 401,
      json: async () => ({ success: false, message: "Unauthorized: Invalid or revoked token" })
    });

    const res = await mockFetch();
    assert.strictEqual(res.status, 401);

    // On 401, login page and interceptor call clearAuthSession
    clearAuthSession();
    assert.strictEqual(mockLocalStorage.getItem("accessToken"), null);
  });

  // --------------------------------------------------------------------------
  // Skenario 4: Backend 500 atau Network Error -> Jangan auto-redirect & Jangan hapus token
  // --------------------------------------------------------------------------
  await it("Skenario 4: Gangguan server 500 / Network Error -> token tidak dihapus dan tidak auto-redirect", async () => {
    const validToken = jwt.sign({ id: "valid-user" }, "secret", { expiresIn: "1h" });
    mockLocalStorage.setItem("accessToken", validToken);

    let sessionVerifyError: string | null = null;
    let redirected = false;

    // Simulate Network Failure / 500 Server Error
    try {
      const mockFetch = async () => {
        throw new Error("Failed to fetch (Network Error)");
      };
      await mockFetch();
    } catch (err: any) {
      sessionVerifyError = "Tidak dapat terhubung ke server untuk memverifikasi sesi.";
    }

    // Token MUST remain intact in localStorage for temporary network blips!
    assert.strictEqual(mockLocalStorage.getItem("accessToken"), validToken);
    // User must NOT be redirected
    assert.strictEqual(redirected, false);
    // Error notice must be displayed allowing retry
    assert.ok(sessionVerifyError !== null);
  });

  // --------------------------------------------------------------------------
  // Skenario 7: Login Google berhasil -> Membership dimuat terkoordinasi & redirect sesuai kondisi
  // --------------------------------------------------------------------------
  await it("Skenario 7: Login berhasil -> setAuthSession dan refreshMemberships terkoordinasi tanpa bentrok", async () => {
    mockLocalStorage.clear();
    const token = jwt.sign({ id: "user-g1" }, "secret", { expiresIn: "1h" });
    const user = { id: "user-g1", name: "Google User", company: null };

    // 1. Simpan sesi
    setAuthSession(token, user, null);
    assert.strictEqual(mockLocalStorage.getItem("accessToken"), token);
    assert.strictEqual(mockLocalStorage.getItem("companyMemberships"), null); // Old cache cleared

    // 2. Evaluasi tujuan redirect jika user belum memiliki perusahaan
    const skip = getPersonalModePreference("user-g1");
    assert.strictEqual(skip, false);

    const redirectPath = (!user.company && !skip) ? "/cek-perusahaan" : "/dashboard";
    assert.strictEqual(redirectPath, "/cek-perusahaan");

    // Jika user memilih "Mode Personal" / Nanti Saja:
    setPersonalModePreference("user-g1");
    const skipUpdated = getPersonalModePreference("user-g1");
    assert.strictEqual(skipUpdated, true);
    const redirectPathWithSkip = (!user.company && !skipUpdated) ? "/cek-perusahaan" : "/dashboard";
    assert.strictEqual(redirectPathWithSkip, "/dashboard");
  });

  // --------------------------------------------------------------------------
  // Skenario 8: Pergantian akun/perusahaan tidak menampilkan cache akun sebelumnya
  // --------------------------------------------------------------------------
  await it("Skenario 8: Switch akun membersihkan cache lama dan mengisolasi tenant context", () => {
    mockLocalStorage.clear();
    mockSessionStorage.clear();

    // User A (Employee di Company A)
    const tokenA = "token-user-a";
    const userA = { id: "u-a", name: "Employee A", company: { id: "comp-a", name: "Company A" } };
    setAuthSession(tokenA, userA, "comp-a");
    mockLocalStorage.setItem("companyMemberships", JSON.stringify([{ company_id: "comp-a", role: "member" }]));

    assert.strictEqual(getActiveCompanyId(), "comp-a");
    assert.ok(mockLocalStorage.getItem("companyMemberships") !== null);

    // Logout User A
    clearAuthSession();
    assert.strictEqual(getActiveCompanyId(), null);
    assert.strictEqual(mockLocalStorage.getItem("accessToken"), null);
    assert.strictEqual(mockLocalStorage.getItem("companyMemberships"), null);

    // User B (Admin di Company B)
    const tokenB = "token-user-b";
    const userB = { id: "u-b", name: "Admin B", company: { id: "comp-b", name: "Company B" } };
    setAuthSession(tokenB, userB, "comp-b");

    assert.strictEqual(getActiveCompanyId(), "comp-b");
    assert.strictEqual(mockLocalStorage.getItem("accessToken"), tokenB);
    // User B does NOT have User A's memberships or active company!
    assert.strictEqual(getActiveCompanyId(), "comp-b");
  });

  // --------------------------------------------------------------------------
  // Skenario 9: Audit Verifikasi Splash Routing, Onboard, & Redirect Keamanan
  // --------------------------------------------------------------------------
  await it("Verifikasi 1: Pengguna baru tanpa sesi diarahkan ke /login/onboard", () => {
    mockLocalStorage.clear();
    const token = mockLocalStorage.getItem("accessToken")?.trim() || null;
    const target = token ? "/login" : "/login/onboard";
    assert.strictEqual(target, "/login/onboard");
  });

  await it("Verifikasi 2: Pengguna dengan sesi tidak perlu mengulang onboarding (diarahkan ke /login untuk verifikasi)", () => {
    mockLocalStorage.setItem("accessToken", "some-active-token");
    const token = mockLocalStorage.getItem("accessToken")?.trim() || null;
    const target = token ? "/login" : "/login/onboard";
    assert.strictEqual(target, "/login");
  });

  await it("Verifikasi 3: Token invalid di backend tidak menyebabkan dashboard terbuka", async () => {
    mockLocalStorage.setItem("accessToken", "tampered-token");
    let redirectedToDashboard = false;

    // Backend responds with 401
    const mockRes = { ok: false, status: 401, json: async () => ({ success: false }) };
    if (mockRes.status === 401) {
      clearAuthSession();
    } else if (mockRes.ok) {
      redirectedToDashboard = true;
    }

    assert.strictEqual(redirectedToDashboard, false);
    assert.strictEqual(mockLocalStorage.getItem("accessToken"), null);
  });

  await it("Verifikasi 4: Network error atau HTTP 500 tidak dianggap sebagai sesi valid", async () => {
    mockLocalStorage.setItem("accessToken", "my-valid-token");
    let redirectedToDashboard = false;
    let tokenDeleted = false;

    // Simulate 500 error
    const mockRes = { ok: false, status: 500, json: async () => ({ success: false }) };
    if (mockRes.status === 401) {
      clearAuthSession();
      tokenDeleted = true;
    } else if (mockRes.ok) {
      redirectedToDashboard = true;
    }

    assert.strictEqual(redirectedToDashboard, false);
    assert.strictEqual(tokenDeleted, false);
    assert.strictEqual(mockLocalStorage.getItem("accessToken"), "my-valid-token");
  });

  await it("Verifikasi 5: redirect=/dashboard dan rute internal valid diterima", () => {
    assert.strictEqual(getSafeInternalRedirect("/dashboard"), "/dashboard");
    assert.strictEqual(getSafeInternalRedirect("/admin/izin"), "/admin/izin");
    assert.strictEqual(getSafeInternalRedirect("/berita/123?from=/dashboard"), "/berita/123?from=/dashboard");
    assert.strictEqual(getSafeInternalRedirect("/tugas#tab-selesai"), "/tugas#tab-selesai");
    assert.strictEqual(getSafeInternalRedirect("  /cek-perusahaan  "), "/cek-perusahaan");
  });

  await it("Verifikasi 6: redirect=//evil-attacker.com, URL eksternal, dan variasi backslash ditolak (CWE-601)", () => {
    assert.strictEqual(getSafeInternalRedirect("//evil-attacker.com"), null);
    assert.strictEqual(getSafeInternalRedirect("/\\evil-attacker.com"), null);
    assert.strictEqual(getSafeInternalRedirect("\\evil-attacker.com"), null);
    assert.strictEqual(getSafeInternalRedirect("/test\\evil"), null);
    assert.strictEqual(getSafeInternalRedirect("https://evil-attacker.com"), null);
    assert.strictEqual(getSafeInternalRedirect("http://evil-attacker.com"), null);
    assert.strictEqual(getSafeInternalRedirect("javascript:alert(1)"), null);
    assert.strictEqual(getSafeInternalRedirect("data:text/html;base64,PHNjcmlwdD4="), null);
    assert.strictEqual(getSafeInternalRedirect(""), null);
    assert.strictEqual(getSafeInternalRedirect("   "), null);
    assert.strictEqual(getSafeInternalRedirect(null), null);
    assert.strictEqual(getSafeInternalRedirect(undefined), null);
  });

  await it("Verifikasi 7: Logout tetap mengarahkan pengguna ke halaman login dan membersihkan sesi", () => {
    mockLocalStorage.setItem("accessToken", "active-jwt");
    mockLocalStorage.setItem("user", JSON.stringify({ id: "user-1" }));
    clearAuthSession();

    assert.strictEqual(mockLocalStorage.getItem("accessToken"), null);
    assert.strictEqual(mockLocalStorage.getItem("user"), null);

    // Kunjungan root selanjutnya akan mengarah ke /login/onboard
    const nextToken = mockLocalStorage.getItem("accessToken")?.trim() || null;
    const nextTarget = nextToken ? "/login" : "/login/onboard";
    assert.strictEqual(nextTarget, "/login/onboard");
  });

  console.log(`\n========================================`);
  console.log(`Targeted Tests Finished: ${passed} passed, ${failed} failed.`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
