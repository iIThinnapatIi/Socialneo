// ===================================================
// ================ CONFIG (Smart API BASE) ==========
// ===================================================

const isProd = import.meta.env.PROD;

// BASE ของ backend (ไม่รวม /api)
export const API_BASE = isProd
    ? "https://utccbackend.onrender.com"           // Render (ออนไลน์)
    : `http://${window.location.hostname}:8082`;   // dev บนเครื่อง

// ❗ ตอนนี้ backend ไม่มี /api แล้ว → ห้ามใส่ "/api"
export const API_PREFIX = "";                      // <<<<<< แก้เป็นค่าว่าง

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

async function http(method, path, { params, body } = {}) {
    const qs = toQuery(params);
    const url = `${API_BASE}${path}${qs ? `?${qs}` : ""}`;

    const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
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

// ตอนนี้ p() จะให้ path แบบไม่มี /api เช่น "/analysis"
const p = (sub) => joinPath(API_PREFIX, sub);

// ===================================================
// ======================== APIs ======================
// ===================================================

// ---------------- Dashboard / Mentions ----------------
export function getTweetAnalysis(params = {}) {
    // GET /analysis
    return get(p("/analysis"), params);
}

export function getTweetDates(params = {}) {
    // GET /analysis/tweet-dates
    return get(p("/analysis/tweet-dates"), params);
}

export function getAnalysisSummary(params = {}) {
    // GET /analysis/summary
    return get(p("/analysis/summary"), params);
}

// ---------------- Alerts ----------------
export function postScanAlerts() {
    // POST /alerts/scan
    return post(p("/alerts/scan"));
}

export function postTestMail() {
    // POST /alerts/test
    return post(p("/alerts/test"));
}

// ---------------- Model Evaluation ----------------
export function getModelEval() {
    // GET /analysis/eval
    return get(p("/analysis/eval"));
}

export function getExplainById(id) {
    // GET /analysis/{id}/explain
    return get(p(`/analysis/${id}/explain`));
}

// ---------------- Custom Keywords ----------------
export function getCustomKeywords() {
    // GET /custom-keywords
    return get(p("/custom-keywords"));
}

export function createCustomKeyword(payload) {
    // POST /custom-keywords
    return post(p("/custom-keywords"), payload);
}

export function updateCustomKeyword(id, payload) {
    // PUT /custom-keywords/{id}
    return put(p(`/custom-keywords/${id}`), payload);
}
