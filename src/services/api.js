// ===================================================
// ================ CONFIG (Smart API BASE) ===========
// ===================================================
//
// ลำดับการเลือก API_BASE:
// 1) ถ้ามี .env → ใช้ VITE_API_BASE
// 2) ถ้าไม่มี ให้ fallback เป็น backend local :8082
//
// ตัวอย่าง .env
// VITE_API_BASE=https://utccbackend.onrender.com
// VITE_API_PREFIX=/api
// VITE_API_CRED=include
//

export const API_BASE =
    import.meta.env.VITE_API_BASE || `http://${window.location.hostname}:8082`;

export const API_PREFIX = import.meta.env.VITE_API_PREFIX || "/api";

// credentials สำหรับ fetch
const CREDENTIALS = import.meta.env.VITE_API_CRED || "same-origin";


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
        credentials: CREDENTIALS,
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) throw new Error(`API Error ${res.status}`);

    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? await res.json() : null;
}

const get = (path, params) => http("GET", path, { params });
const post = (path, body) => http("POST", path, { body });
const put = (path, body) => http("PUT", path, { body });

// ทำให้ทุก path มี `/api` นำหน้าอัตโนมัติ
const p = (sub) => joinPath(API_PREFIX, sub);


// ===================================================
// ======================== APIs ======================
// ===================================================

// ---------------- Dashboard / Mentions ----------------
export function getTweetAnalysis(params = {}) {
    return get(p("/analysis"), params);
}

export function getTweetDates(params = {}) {
    return get(p("/analysis/tweet-dates"), params);
}

export function getAnalysisSummary(params = {}) {
    return get(p("/analysis/summary"), params);
}

// ---------------- Alerts ----------------
export function postScanAlerts() {
    return post(p("/alerts/scan"));
}

export function postTestMail() {
    return post(p("/alerts/test"));
}

// ---------------- Model Evaluation ----------------
export function getModelEval() {
    return get(p("/analysis/eval"));
}

export function getExplainById(id) {
    return get(p(`/analysis/${id}/explain`));
}

// ---------------- Custom Keywords ----------------
export function getCustomKeywords() {
    return get(p("/custom-keywords"));
}

export function createCustomKeyword(payload) {
    return post(p("/custom-keywords"), payload);
}

export function updateCustomKeyword(id, payload) {
    return put(p(`/custom-keywords/${id}`), payload);
}
