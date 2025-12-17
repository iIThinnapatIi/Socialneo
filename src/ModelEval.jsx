// src/ModelEval.jsx
import React, { useState } from "react";
import "./Dashboard.css";
import { Link } from "react-router-dom";
import { API_BASE, API_PREFIX } from "./services/api";

export default function ModelEval() {
    // ===============================
    // Playground
    // ===============================
    const [testText, setTestText] = useState("");
    const [testResult, setTestResult] = useState(null);
    const [testError, setTestError] = useState("");
    const [loadingTest, setLoadingTest] = useState(false);

    const handleTryEval = async () => {
        if (!testText.trim()) return;

        try {
            setLoadingTest(true);
            setTestError("");
            setTestResult(null);

            const res = await fetch(
                `${API_BASE}${API_PREFIX}/analysis/eval/try`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: testText }),
                }
            );

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt);
            }

            setTestResult(await res.json());
        } catch (e) {
            setTestError(e.message || "เกิดข้อผิดพลาด");
        } finally {
            setLoadingTest(false);
        }
    };

    // ===============================
    // Explain
    // ===============================
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
                throw new Error(txt);
            }

            setExplain(await res.json());
        } catch (e) {
            setExplainError(e.message || "เกิดข้อผิดพลาด");
        } finally {
            setLoadingExplain(false);
        }
    };

    const testLabel = testResult?.label || "-";
    const testScore =
        testResult?.sentimentScore != null
            ? testResult.sentimentScore.toFixed(3)
            : "-";

    const matched = explain?.matchedKeywords || [];

    return (
        <div className="dashboard-container">
            {/* ===== Sidebar ===== */}
            <div className="sidebar">
                <div className="logo-container">
                    <img
                        src="https://upload.wikimedia.org/wikipedia/th/f/f5/%E0%B8%95%E0%B8%A3%E0%B8%B2%E0%B8%A1%E0%B8%AB%E0%B8%B2%E0%B8%A7%E0%B8%B4%E0%B8%97%E0%B8%A2%E0%B8%B2%E0%B8%A5%E0%B8%B1%E0%B8%A2%E0%B8%AB%E0%B8%AD%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B8%84%E0%B9%89%E0%B8%B2%E0%B9%84%E0%B8%97%E0%B8%A2.svg"
                        alt="UTCC"
                    />
                    <span className="logo-utcc">UTCC</span>
                    <span className="logo-social">Social</span>
                </div>

                <nav className="nav-menu">
                    <Link to="/dashboard" className="nav-item">Dashboard</Link>
                    <Link to="/mentions" className="nav-item">Mentions</Link>
                    <Link to="/trends" className="nav-item">Trends</Link>
                    <Link to="/trends2" className="nav-item">Keywords</Link>
                    <Link to="/model-eval" className="nav-item active">
                        Model Eval
                    </Link>
                </nav>
            </div>

            {/* ===== Main ===== */}
            <div className="main-content">
                <header className="main-header">
                    <h1>Model Evaluation</h1>
                    <p>
                        ทดลองโมเดลวิเคราะห์ sentiment และอธิบายเหตุผลของโพสต์รายตัว
                    </p>
                </header>

                {/* Playground */}
                <section className="card">
                    <h3>ทดลองให้โมเดลวิเคราะห์ข้อความ (Playground)</h3>

                    <div className="form-grid">
                        <textarea
                            value={testText}
                            onChange={(e) => setTestText(e.target.value)}
                            rows={3}
                            placeholder="เช่น: ห้องสมุดใหม่สวยมากแต่คนเยอะไปหน่อย"
                            className="input"
                        />
                        <button
                            className="btn primary"
                            onClick={handleTryEval}
                            disabled={loadingTest}
                        >
                            {loadingTest ? "กำลังวิเคราะห์..." : "ลองวิเคราะห์"}
                        </button>
                    </div>

                    {testError && (
                        <div className="placeholder error">{testError}</div>
                    )}

                    {testResult && (
                        <div className="result-card">
                            <div><b>Label:</b> {testLabel}</div>
                            <div><b>Score:</b> {testScore}</div>
                        </div>
                    )}
                </section>

                {/* Explain */}
                <section className="card">
                    <h3>อธิบายผลวิเคราะห์ของโพสต์ทีละรายการ</h3>

                    <div className="form-row">
                        <input
                            value={idInput}
                            onChange={(e) => setIdInput(e.target.value)}
                            placeholder="เช่น cmt-114, pt-10, tw-12345"
                            className="input"
                        />
                        <button
                            className="btn primary"
                            onClick={handleExplain}
                            disabled={loadingExplain}
                        >
                            {loadingExplain ? "กำลังดึง..." : "ดูเหตุผล"}
                        </button>
                    </div>

                    {explainError && (
                        <div className="placeholder error">{explainError}</div>
                    )}

                    {explain && (
                        <div className="result-card">
                            <div><b>ID:</b> {explain.id}</div>
                            <div><b>ข้อความ:</b> {explain.text}</div>
                            <div><b>Model label:</b> {explain.modelLabel}</div>
                            <div><b>Final label:</b> {explain.finalLabel}</div>
                            <div><b>Score:</b> {explain.sentimentScore}</div>
                            <div><b>คณะ:</b> {explain.faculty}</div>

                            <div style={{ marginTop: 10 }}>
                                <b>Custom keywords ที่ match:</b>
                                {matched.length === 0 ? (
                                    <div>- ไม่มี -</div>
                                ) : (
                                    <ul>
                                        {matched.map((k, i) => (
                                            <li key={i}>
                                                {k.keyword} → {k.sentiment}
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
