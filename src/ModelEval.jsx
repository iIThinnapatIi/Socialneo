// src/ModelEval.jsx
import React, { useEffect, useState } from "react";
import "./Homepage.css";
import { Link } from "react-router-dom";
import { API_BASE, API_PREFIX } from "./services/api";

export default function ModelEval() {
    // --------- สรุปผลประเมินโมเดล (accuracy / per-class) ---------
    const [summary, setSummary] = useState(null);
    const [summaryError, setSummaryError] = useState("");
    const [loadingSummary, setLoadingSummary] = useState(true);

    useEffect(() => {
        async function loadSummary() {
            try {
                setLoadingSummary(true);
                setSummaryError("");

                const res = await fetch(
                    `${API_BASE}${API_PREFIX}/analysis/eval`
                );
                if (!res.ok) {
                    throw new Error(
                        `โหลดผลประเมินโมเดลไม่สำเร็จ (status ${res.status})`
                    );
                }
                const json = await res.json();
                setSummary(json);
            } catch (e) {
                console.error(e);
                setSummaryError(e.message || "เกิดข้อผิดพลาด");
            } finally {
                setLoadingSummary(false);
            }
        }

        loadSummary();
    }, []);

    // --------- อธิบายผลของโพสต์ทีละตัว ---------
    const [idInput, setIdInput] = useState("");
    const [explain, setExplain] = useState(null);
    const [explainError, setExplainError] = useState("");
    const [loadingExplain, setLoadingExplain] = useState(false);

    const handleExplain = async () => {
        if (!idInput.trim()) return;

        try {
            setLoadingExplain(true);
            setExplain(null);
            setExplainError("");

            const res = await fetch(
                `${API_BASE}${API_PREFIX}/analysis/${idInput.trim()}/explain`
            );

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(
                    `ดึงเหตุผลไม่สำเร็จ (status ${res.status}) : ${txt}`
                );
            }

            const json = await res.json();
            setExplain(json);
        } catch (e) {
            console.error(e);
            setExplain(null);
            setExplainError(
                e.message || "เกิดข้อผิดพลาดขณะดึงเหตุผลของโพสต์นี้"
            );
        } finally {
            setLoadingExplain(false);
        }
    };

    // --------- เตรียมข้อมูลสรุป (กัน null) ---------
    const totalSamples = summary?.totalSamples ?? "-";
    const accuracy =
        summary?.accuracy != null
            ? `${(summary.accuracy * 100).toFixed(1)}%`
            : "-";

    const perClass = summary?.perClass || {};
    const classRows = [
        { name: "negative", data: perClass.negative || {} },
        { name: "neutral", data: perClass.neutral || {} },
        { name: "positive", data: perClass.positive || {} },
    ];

    // --------- เตรียมข้อมูล explain (กัน null) ---------
    const matched = (explain && explain.matchedKeywords) || [];
    const text = explain?.text || "";
    const finalLabel = explain?.finalLabel || "-";
    const modelLabel = explain?.modelLabel || "-";
    const faculty = explain?.faculty || "-";
    const score =
        explain?.sentimentScore !== undefined &&
        explain?.sentimentScore !== null
            ? explain.sentimentScore.toFixed(3)
            : "-";

    return (
        <div className="homepage-container">
            {/* ===== Sidebar ===== */}
            <div className="sidebar">
                <div className="logo-container">
                    <img
                        src="https://upload.wikimedia.org/wikipedia/th/f/f5/%E0%B8%95%E0%B8%A3%E0%B8%B2%E0%B8%A1%E0%B8%AB%E0%B8%B2%E0%B8%A7%E0%B8%B4%E0%B8%97%E0%B8%A2%E0%B8%B2%E0%B8%A5%E0%B8%B1%E0%B8%A2%E0%B8%AB%E0%B8%AD%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B8%84%E0%B9%89%E0%B8%B2%E0%B9%84%E0%B8%97%E0%B8%A2.svg"
                        width="100%"
                        alt="UTCC"
                    />
                    <span className="logo-utcc"> UTCC </span>
                    <span className="logo-social"> Social</span>
                </div>

                <nav className="nav-menu">
                    <Link to="/dashboard" className="nav-item">
                        <span>Dashboard</span>
                    </Link>
                    <Link to="/mentions" className="nav-item">
                        <span>Mentions</span>
                    </Link>
                    <Link to="/trends" className="nav-item">
                        <span>Trends</span>
                    </Link>
                    <Link to="/trends2" className="nav-item">
                        <span>Keywords</span>
                    </Link>
                    <Link to="/model-eval" className="nav-item active">
                        <span>Model Eval</span>
                    </Link>
                </nav>
            </div>

            {/* ===== Main Content ===== */}
            <div className="main-content">
                <header className="main-header">
                    <div className="header-left">
                        <h1>Model Evaluation</h1>
                        <div>
                            ดูความน่าเชื่อถือของโมเดล และเหตุผลที่แต่ละโพสต์ถูกจัดเป็น{" "}
                            positive / neutral / negative
                        </div>
                    </div>
                </header>

                {/* ---------- กล่องสรุปค่า accuracy ---------- */}
                <section className="kpi-grid">
                    <div className="kpi-card pos">
                        <div className="kpi-title">
                            Total Samples (ที่ใช้วัดโมเดล)
                        </div>
                        <div className="kpi-value">
                            {loadingSummary ? "…" : totalSamples}
                        </div>
                    </div>
                    <div className="kpi-card neu">
                        <div className="kpi-title">Accuracy</div>
                        <div className="kpi-value">
                            {loadingSummary ? "…" : accuracy}
                        </div>
                    </div>
                </section>

                {/* ---------- ตาราง precision / recall / f1 ---------- */}
                <section className="card">
                    <h3>ผลการวัดรายคลาส (negative / neutral / positive)</h3>

                    {summaryError && (
                        <div
                            className="placeholder"
                            style={{ color: "#b91c1c" }}
                        >
                            โหลดข้อมูลไม่สำเร็จ: {summaryError}
                        </div>
                    )}

                    {loadingSummary ? (
                        <div className="placeholder">กำลังโหลด...</div>
                    ) : (
                        <div className="table">
                            <div className="t-head">
                                <div>Class</div>
                                <div>Precision</div>
                                <div>Recall</div>
                                <div>F1-score</div>
                            </div>

                            {classRows.map((r) => (
                                <div className="t-row" key={r.name}>
                                    <div>{r.name}</div>
                                    <div>
                                        {r.data.precision !== undefined &&
                                        r.data.precision !== null
                                            ? r.data.precision.toFixed(2)
                                            : "-"}
                                    </div>
                                    <div>
                                        {r.data.recall !== undefined &&
                                        r.data.recall !== null
                                            ? r.data.recall.toFixed(2)
                                            : "-"}
                                    </div>
                                    <div>
                                        {r.data.f1 !== undefined &&
                                        r.data.f1 !== null
                                            ? r.data.f1.toFixed(2)
                                            : "-"}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* ---------- ส่วนอธิบายโพสต์ทีละอัน ---------- */}
                <section className="card">
                    <h3>อธิบายผลวิเคราะห์ของโพสต์ทีละรายการ</h3>

                    <div
                        style={{
                            display: "flex",
                            gap: 10,
                            marginBottom: 16,
                            flexWrap: "wrap",
                        }}
                    >
                        <input
                            value={idInput}
                            onChange={(e) => setIdInput(e.target.value)}
                            placeholder="เช่น cmt-114, pt-10, tw-12345"
                            style={{
                                flex: 1,
                                minWidth: 260,
                                padding: "8px 10px",
                                borderRadius: 10,
                                border: "1px solid #cbd5e1",
                            }}
                        />
                        <button
                            className="btn primary"
                            type="button"
                            onClick={handleExplain}
                            disabled={loadingExplain}
                        >
                            {loadingExplain ? "กำลังดึง..." : "ดูเหตุผล"}
                        </button>
                    </div>

                    {explainError && (
                        <div
                            className="placeholder"
                            style={{ color: "#b91c1c" }}
                        >
                            {explainError}
                        </div>
                    )}

                    {loadingExplain && (
                        <div className="placeholder">กำลังดึงข้อมูล...</div>
                    )}

                    {explain && !loadingExplain && !explainError && (
                        <div
                            style={{
                                background: "#f8fafc",
                                borderRadius: 12,
                                padding: 16,
                                border: "1px solid #e2e8f0",
                            }}
                        >
                            <div style={{ marginBottom: 8 }}>
                                <b>ID:</b> {explain.id}
                            </div>

                            <div
                                style={{
                                    marginBottom: 8,
                                    whiteSpace: "pre-wrap",
                                }}
                            >
                                <b>ข้อความ:</b> {text}
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    gap: 24,
                                    flexWrap: "wrap",
                                }}
                            >
                                <div>
                                    <b>Model label:</b> {modelLabel}
                                </div>
                                <div>
                                    <b>
                                        Final label (หลัง custom keyword):
                                    </b>{" "}
                                    {finalLabel}
                                </div>
                                <div>
                                    <b>คะแนนเชื่อมั่น (sentimentScore):</b>{" "}
                                    {score}
                                </div>
                                <div>
                                    <b>คณะ:</b> {faculty}
                                </div>
                            </div>

                            <div style={{ marginTop: 12 }}>
                                <b>คำ custom keyword ที่ไป match:</b>{" "}
                                {matched.length === 0 ? (
                                    <span>
                                        - โพสต์นี้ไม่มีคำที่อยู่ใน custom
                                        keywords -
                                    </span>
                                ) : (
                                    <ul>
                                        {matched.map((kw, idx) => (
                                            <li key={kw.id ?? idx}>
                                                คำว่า{" "}
                                                <b>
                                                    {kw.keyword ??
                                                        kw.word ??
                                                        String(kw)}
                                                </b>{" "}
                                                ทำให้ระบบเปลี่ยน sentiment
                                                เป็น{" "}
                                                <b>
                                                    {kw.sentiment ??
                                                        finalLabel}
                                                </b>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
