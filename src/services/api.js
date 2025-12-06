// src/services/api.js

// ==================== CONFIG ====================
// ให้ host อิงจากเครื่องที่เปิดหน้าเว็บ (จะเป็น localhost หรือ IP ภายในก็ได้)
const host = window.location.hostname;
export const API_BASE = `http://${host}:8082`;
export const API_PREFIX = "/api";

const CREDENTIALS = "same-origin";

// ==================== HELPERS ====================
function joinPath(...parts) {
    return (
        "/" +
        parts
            .filter(Boolean)
            .map((p) => String(p).replace(/^\/+|\/+$/g, ""))
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
        credentials: CREDENTIALS,
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) throw new Error(`API Error ${res.status}`);

    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? await res.json() : null;
}

const get = (path, params) => http("GET", path, { params });
const post = (path, body) => http("POST", path, { body });
// ⭐ helper PUT
const put = (path, body) => http("PUT", path, { body });

// Path helper → ใช้ prefix /api ให้อัตโนมัติ
const p = (sub) => joinPath(API_PREFIX, sub);

// ==================== REAL APIs ====================

// ------ Dashboard / Mentions ------

// GET → /api/analysis
export function getTweetAnalysis(params = {}) {
    return get(p("/analysis"), params);
}

// GET → /api/analysis/tweet-dates
export function getTweetDates(params = {}) {
    return get(p("/analysis/tweet-dates"), params);
}

// ---------- Dashboard Summary ----------
// GET → /api/analysis/summary
export function getAnalysisSummary(params = {}) {
    return get(p("/analysis/summary"), params);
}

// ------ Alerts ------

export function postScanAlerts() {
    return post(p("/alerts/scan"));
}

export function postTestMail() {
    return post(p("/alerts/test"));
}

// ===================================================
// =============== Model Evaluation APIs =============
// ===================================================

// GET  /api/analysis/eval
// ใช้ดึงสรุป accuracy / precision / recall / f1
export function getModelEval() {
    return get(p("/analysis/eval"));
}

// GET  /api/analysis/{id}/explain
// ใช้ดูเหตุผลว่าโพสต์นี้ถูกจัดเป็น positive/neutral/negative เพราะอะไร
export function getExplainById(id) {
    return get(p(`/analysis/${id}/explain`));
}


// ===================================================
// ================= Custom Keywords =================
// ===================================================

// GET → /api/custom-keywords
export function getCustomKeywords() {
    return get(p("/custom-keywords"));
}

// POST → /api/custom-keywords
export function createCustomKeyword(payload) {
    return post(p("/custom-keywords"), payload);
}

// ⭐ PUT → /api/custom-keywords/{id}
// ใช้เวลาเปลี่ยน sentiment ของ keyword ในหน้า Keywords.jsx
export function updateCustomKeyword(id, payload) {
    return put(p(`/custom-keywords/${id}`), payload);
}
