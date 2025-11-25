// src/services/api.js

// ==================== CONFIG ====================
const host = window.location.hostname; // ถ้าเปิดจากเครื่องอื่นจะเป็น 192.168.x.x
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
// Path helper → ใช้ prefix /api ให้อัตโนมัติ
const p = (sub) => joinPath(API_PREFIX, sub);

// ==================== REAL APIs ====================

// ------ Dashboard / Mentions ------
export function getTweetAnalysis(params = {}) {
    return get(p("/analysis"), params);
}

export function getTweetDates(params = {}) {
    return get(p("/analysis/tweet-dates"), params);
}

// ---------- Dashboard Summary ----------
// GET → http://<host>:8082/api/analysis/summary
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
// ================= Custom Keywords =================
// ===================================================
export function getCustomKeywords() {
    // GET → http://<host>:8082/api/custom-keywords
    return get(p("/custom-keywords"));
}

export function createCustomKeyword(payload) {
    // POST → http://<host>:8082/api/custom-keywords
    return post(p("/custom-keywords"), payload);
}
