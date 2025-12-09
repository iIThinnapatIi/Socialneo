// ===================================================
// ================ CONFIG (Smart API BASE) ===========
// ===================================================
//
// โหมด prod (Netlify)  -> ยิงไป Render
// โหมด dev (npm run dev) -> ยิงไป backend :8082 บนเครื่องเรา
//

const isProd = import.meta.env.PROD;

// BASE ของ backend (ไม่รวม /api)
export const API_BASE = isProd
    ? "https://utccbackend.onrender.com"           // ✅ Render (ออนไลน์)
    : `http://${window.location.hostname}:8082`;   // ✅ dev บนเครื่อง

// ✅ backend ของเรามี prefix /api อยู่แล้ว (@RequestMapping("/api/analysis"))
//    เพราะงั้นต้องใส่ "/api" ตรงนี้
export const API_PREFIX = "/api";

// ===================================================
// ====================== HELPERS =====================
// ===================================================

function joinPath(...parts) {
    return (
        "/" +
        parts
            .filter(Boolean)
            .map((p) => String(p).replace(/^\/+|\/+$/g, "")) // ตัด / หน้า-หลัง
            .join("/")
    );
}

function toQuery(params = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v).trim() !== "") {
            q.set(k, v);
        }
    });
    return q.toString();
}

// ---------------------- HTTP WRAPPER ----------------------
async function http(method, path, { params, body } = {}) {
    const qs = toQuery(params);
    const url = `${API_BASE}${path}${qs ? `?${qs}` : ""}`;

    const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        // ตอนนี้เราไม่ได้ใช้ cookie อะไรเป็นพิเศษ สามารถไม่ใส่ credentials ก็ได้
        // ถ้าภายหลังใช้ session/cookie ค่อยเปิดบรรทัดล่างนี้
        // credentials: "include",
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`API Error ${res.status}: ${text || url}`);
    }

    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? await res.json() : null;
}

const get = (path, params) => http("GET", path, { params });
const post = (path, body) => http("POST", path, { body });
const put = (path, body) => http("PUT", path, { body });

// ทำให้ทุก path มี API_PREFIX นำหน้าอัตโนมัติ เช่น "/api/analysis"
const p = (sub) => joinPath(API_PREFIX, sub);

// ===================================================
// ======================== APIs ======================
// ===================================================

// ---------------- Dashboard / Mentions ----------------
export function getTweetAnalysis(params = {}) {
    // GET /api/analysis
    return get(p("/analysis"), params);
}

export function getTweetDates(params = {}) {
    // GET /api/analysis/tweet-dates
    return get(p("/analysis/tweet-dates"), params);
}

export function getAnalysisSummary(params = {}) {
    // GET /api/analysis/summary
    return get(p("/analysis/summary"), params);
}

// ---------------- Alerts ----------------
export function postScanAlerts() {
    // POST /api/alerts/scan
    return post(p("/alerts/scan"));
}

export function postTestMail() {
    // POST /api/alerts/test
    return post(p("/alerts/test"));
}

// ---------------- Model Evaluation ----------------
export function getModelEval() {
    // GET /api/analysis/eval
    return get(p("/analysis/eval"));
}

export function getExplainById(id) {
    // GET /api/analysis/{id}/explain
    return get(p(`/analysis/${id}/explain`));
}

// ---------------- Custom Keywords ----------------
export function getCustomKeywords() {
    // GET /api/custom-keywords
    return get(p("/custom-keywords"));
}

export function createCustomKeyword(payload) {
    // POST /api/custom-keywords
    return post(p("/custom-keywords"), payload);
}

export function updateCustomKeyword(id, payload) {
    // PUT /api/custom-keywords/{id}
    return put(p(`/custom-keywords/${id}`), payload);
}
