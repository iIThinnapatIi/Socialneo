// ===================================================
// ================ CONFIG (Smart API BASE) ===========
// ===================================================
//
// ถ้าเป็นโหมด production (Netlify)  -> ยิงไป Render
// ถ้าเป็นโหมด dev (npm run dev)      -> ยิงไป backend :8082 บนเครื่องเรา
//

const isProd = import.meta.env.PROD;

export const API_BASE = isProd
    ? "https://utccbackend.onrender.com"          // ✅ ใช้ Render ตอนออนไลน์
    : `http://${window.location.hostname}:8082`;  // ✅ ใช้ backend :8082 ตอน dev

// ⚠ ตอนนี้ backend บน Render **ไม่มี** /api นำหน้า
// ถ้าใส่ "/api" จะกลายเป็น /api/analysis แล้ว 404
export const API_PREFIX = ""; // ✅ ปล่อยว่างไว้

// ❌ ไม่ใช้ cookie / credentials อีกแล้ว (ตัด CORS ง่ายขึ้น)
// const CREDENTIALS = "include";


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
        // ❌ ไม่ต้องส่ง credentials แล้ว
        // credentials: CREDENTIALS,
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
        throw new Error(`API Error ${res.status}`);
    }

    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? await res.json() : null;
}

const get = (path, params) => http("GET", path, { params });
const post = (path, body) => http("POST", path, { body });
const put = (path, body) => http("PUT", path, { body });

// ทำให้ทุก path มี API_PREFIX นำหน้าอัตโนมัติ (ตอนนี้คือ "")
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
