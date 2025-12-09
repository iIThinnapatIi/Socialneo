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

    // --------- จัดการ evaluation_samples ---------
    const [samples, setSamples] = useState([]);
    const [samplesError, setSamplesError] = useState("");
    const [loadingSamples, setLoadingSamples] = useState(true);

    const [newText, setNewText] = useState("");
    const [newLabel, setNewLabel] = useState("positive");
    const [savingSample, setSavingSample] = useState(false);

    // --------- Playground: ลองพิมพ์ข้อความให้โมเดลวิเคราะห์ ---------
    const [testText, setTestText] = useState("");
    const [testResult, setTestResult] = useState(null);
    const [testError, setTestError] = useState("");
    const [loadingTest, setLoadingTest] = useState(false);

    // --------- อธิบายผลของโพสต์ทีละตัว ---------
    const [idInput, setIdInput] = useState("");
    const [explain, setExplain] = useState(null);
    const [explainError, setExplainError] = useState("");
    const [loadingExplain, setLoadingExplain] = useState(false);

    // ------------------------------------------------
    // 1) โหลด summary + samples ตอนเปิดหน้า
    // ------------------------------------------------
    useEffect(() => {
        loadSummary();
        loadSamples();
    }, []);

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

            if (json.status && json.status !== "ok") {
                // กรณี backend ส่ง error style: {status:"error", message:"..."}
                setSummary(null);
                setSummaryError(json.message || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์");
            } else {
                setSummary(json);
            }
        } catch (e) {
            console.error(e);
            setSummaryError(e.message || "เกิดข้อผิดพลาด");
            setSummary(null);
        } finally {
            setLoadingSummary(false);
        }
    }

    async function loadSamples() {
        try {
            setLoadingSamples(true);
            setSamplesError("");

            const res = await fetch(
                `${API_BASE}${API_PREFIX}/analysis/eval/samples`
            );
            if (!res.ok) {
                throw new Error(
                    `โหลด evaluation samples ไม่สำเร็จ (status ${res.status})`
                );
            }
            const json = await res.json();
            setSamples(Array.isArray(json) ? json : []);
        } catch (e) {
            console.error(e);
            setSamplesError(e.message || "เกิดข้อผิดพลาดขณะโหลด evaluation samples");
            setSamples([]);
        } finally {
            setLoadingSamples(false);
        }
    }

    // ------------------------------------------------
    // 2) จัดการ evaluation_samples
    // ------------------------------------------------
    const handleAddSample = async () => {
        if (!newText.trim()) return;

        try {
            setSavingSample(true);
            setSamplesError("");

            const res = await fetch(
                `${API_BASE}${API_PREFIX}/analysis/eval/samples`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        text: newText,
                        trueLabel: newLabel,
                    }),
                }
            );

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(
                    `เพิ่ม evaluation sample ไม่สำเร็จ (status ${res.status}) : ${txt}`
                );
            }

            setNewText("");
            setNewLabel("positive");
            await loadSamples();
            await loadSummary(); // ให้ summary อัปเดตด้วย (totalSamples / accuracy)
        } catch (e) {
            console.error(e);
            setSamplesError(e.message || "เกิดข้อผิดพลาดขณะเพิ่ม sample");
        } finally {
            setSavingSample(false);
        }
    };

    const handleDeleteSample = async (id) => {
        if (!window.confirm(`ต้องการลบ sample id=${id} ใช่หรือไม่?`)) return;

        try {
            setSamplesError("");

            const res = await fetch(
                `${API_BASE}${API_PREFIX}/analysis/eval/samples/${id}`,
                { method: "DELETE" }
            );

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(
                    `ลบ evaluation sample ไม่สำเร็จ (status ${res.status}) : ${txt}`
                );
            }

            await loadSamples();
            await loadSummary();
        } catch (e) {
            console.error(e);
            setSamplesError(e.message || "เกิดข้อผิดพลาดขณะลบ sample");
        }
    };

    // ------------------------------------------------
    // 3) Playground: ให้โมเดลวิเคราะห์ text ที่พิมพ์เอง
    // ------------------------------------------------
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
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        text: testText,
                    }),
                }
            );

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(
                    `วิเคราะห์ข้อความไม่สำเร็จ (status ${res.status}) : ${txt}`
                );
            }

            const json = await res.json();
            setTestResult(json);
        } catch (e) {
            console.error(e);
            setTestError(e.message || "เกิดข้อผิดพลาดขณะวิเคราะห์ข้อความ");
            setTestResult(null);
        } finally {
            setLoadingTest(false);
        }
    };

    // ------------------------------------------------
    // 4) อธิบายผลของโพสต์ทีละตัว (ของ social_analysis)
// ------------------------------------------------
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

    const testLabel = testResult?.label || "-";
    const testScore =
        testResult?.sentimentScore !== undefined &&
        testResult?.sentimentScore !== null
            ? testResult.sentimentScore.toFixed(3)
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
                            ดูความน่าเชื่อถือของโมเดล และให้ผู้ใช้ทดลอง
                            ปรับชุดทดสอบ (evaluation set) และดูเหตุผลว่าแต่ละโพสต์ถูกจัดเป็น{" "}
                            positive / neutral / negative อย่างไร
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

                {/* ---------- จัดการ evaluation_samples ---------- */}
                <section className="card">
                    <h3>จัดการชุดทดสอบ (evaluation_samples)</h3>
                    <p style={{ marginBottom: 8 }}>
                        ส่วนนี้ให้ผู้ใช้ / อาจารย์ เพิ่มหรือลบตัวอย่างข้อความ
                        ที่ใช้เป็น &quot;ข้อสอบ&quot; สำหรับวัดความแม่นของโมเดล
                    </p>

                    {samplesError && (
                        <div
                            className="placeholder"
                            style={{ color: "#b91c1c" }}
                        >
                            {samplesError}
                        </div>
                    )}

                    {/* ฟอร์มเพิ่ม */}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            marginBottom: 16,
                        }}
                    >
                        <textarea
                            value={newText}
                            onChange={(e) => setNewText(e.target.value)}
                            placeholder="พิมพ์ข้อความตัวอย่างที่ต้องการใช้เป็นชุดทดสอบ เช่น 'คณะบัญชีสอนดีมาก อาจารย์ใส่ใจ'"
                            rows={3}
                            style={{
                                width: "100%",
                                padding: "8px 10px",
                                borderRadius: 10,
                                border: "1px solid #cbd5e1",
                                resize: "vertical",
                            }}
                        />
                        <div
                            style={{
                                display: "flex",
                                gap: 10,
                                alignItems: "center",
                                flexWrap: "wrap",
                            }}
                        >
                            <select
                                value={newLabel}
                                onChange={(e) => setNewLabel(e.target.value)}
                                style={{
                                    padding: "6px 10px",
                                    borderRadius: 10,
                                    border: "1px solid #cbd5e1",
                                }}
                            >
                                <option value="positive">positive</option>
                                <option value="neutral">neutral</option>
                                <option value="negative">negative</option>
                            </select>
                            <button
                                className="btn primary"
                                type="button"
                                onClick={handleAddSample}
                                disabled={savingSample}
                            >
                                {savingSample
                                    ? "กำลังบันทึก..."
                                    : "เพิ่มเข้าสู่ชุดทดสอบ"}
                            </button>
                        </div>
                    </div>

                    {/* ตารางแสดง samples */}
                    {loadingSamples ? (
                        <div className="placeholder">กำลังโหลดชุดทดสอบ...</div>
                    ) : samples.length === 0 ? (
                        <div className="placeholder">
                            ยังไม่มี evaluation samples ในระบบ
                        </div>
                    ) : (
                        <div className="table">
                            <div className="t-head">
                                <div style={{ width: 60 }}>ID</div>
                                <div>Text</div>
                                <div style={{ width: 100 }}>True Label</div>
                                <div style={{ width: 80 }}>ลบ</div>
                            </div>
                            {samples.map((s) => (
                                <div className="t-row" key={s.id}>
                                    <div>{s.id}</div>
                                    <div
                                        title={s.text}
                                        style={{
                                            maxHeight: 48,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                        }}
                                    >
                                        {s.text}
                                    </div>
                                    <div>{s.trueLabel}</div>
                                    <div>
                                        <button
                                            type="button"
                                            className="btn danger"
                                            onClick={() =>
                                                handleDeleteSample(s.id)
                                            }
                                        >
                                            ลบ
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* ---------- Playground: ลองให้โมเดลวิเคราะห์ข้อความสด ---------- */}
                <section className="card">
                    <h3>ทดลองให้โมเดลวิเคราะห์ข้อความ (Playground)</h3>
                    <p style={{ marginBottom: 8 }}>
                        ผู้ใช้สามารถพิมพ์ข้อความใด ๆ เพื่อดูว่าโมเดล ONNX
                        วิเคราะห์ออกมาเป็น sentiment อะไร และคะแนนเท่าไหร่
                    </p>

                    <textarea
                        value={testText}
                        onChange={(e) => setTestText(e.target.value)}
                        rows={3}
                        placeholder="ลองพิมพ์ข้อความ เช่น 'ห้องสมุดใหม่สวยมากแต่คนเยอะไปหน่อย'"
                        style={{
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: 10,
                            border: "1px solid #cbd5e1",
                            resize: "vertical",
                            marginBottom: 10,
                        }}
                    />
                    <button
                        className="btn primary"
                        type="button"
                        onClick={handleTryEval}
                        disabled={loadingTest}
                    >
                        {loadingTest ? "กำลังวิเคราะห์..." : "ลองวิเคราะห์"}
                    </button>

                    {testError && (
                        <div
                            className="placeholder"
                            style={{ color: "#b91c1c", marginTop: 10 }}
                        >
                            {testError}
                        </div>
                    )}

                    {testResult && !testError && (
                        <div
                            style={{
                                marginTop: 12,
                                background: "#f8fafc",
                                borderRadius: 12,
                                padding: 16,
                                border: "1px solid #e2e8f0",
                            }}
                        >
                            <div style={{ marginBottom: 8 }}>
                                <b>ข้อความที่ทดสอบ:</b>{" "}
                                <span style={{ whiteSpace: "pre-wrap" }}>
                                    {testText}
                                </span>
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    gap: 24,
                                    flexWrap: "wrap",
                                }}
                            >
                                <div>
                                    <b>Label จากโมเดล:</b> {testLabel}
                                </div>
                                <div>
                                    <b>คะแนนเชื่อมั่น (sentimentScore):</b>{" "}
                                    {testScore}
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                {/* ---------- ส่วนอธิบายโพสต์ทีละอัน (social_analysis) ---------- */}
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
