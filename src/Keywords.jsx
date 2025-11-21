// src/Keywords.jsx
import React, { useMemo, useState } from "react";
import "./Trends.css";
import { Link } from "react-router-dom";

const API_BASE = "http://localhost:8082";

/**
 * หน้า Keywords
 * - ส่วนบน: ฟีเจอร์ดึงโพสต์จาก Pantip แบบทดลอง (preview ก่อนบันทึก)
 * - ส่วนล่าง: ฟอร์มเพิ่ม keyword + ตาราง keyword (ตอนนี้ยังไม่ผูก backend)
 */
export default function Keyword() {
    /* --------------------------------------------------
     * 1) STATE สำหรับตาราง / search ด้านล่าง
     * -------------------------------------------------- */
    const [q, setQ] = useState(""); // คำค้นในช่อง search
    const [trending] = useState([]); // data ในตาราง (ตอนนี้ยังว่าง ไว้ต่อ API ทีหลัง)

    /* --------------------------------------------------
     * 2) ฟอร์มเพิ่ม custom keyword (ฝั่ง front เท่านั้น)
     * -------------------------------------------------- */
    const [word, setWord] = useState("");
    const [label, setLabel] = useState("positive");
    const [customKeywords, setCustomKeywords] = useState([]);

    const addKeyword = () => {
        const clean = word.trim();
        if (!clean) return;

        const item = {
            id: Date.now(),
            word: clean,
            label,
        };

        setCustomKeywords((prev) => [...prev, item]);
        setWord("");
        setLabel("positive");

        console.log("เพิ่มคำใหม่สำหรับ sentiment:", item);
    };

    /* --------------------------------------------------
     * 3) ฟีเจอร์ Pantip (โหมดทดลอง)
     * -------------------------------------------------- */
    const [pantipKeyword, setPantipKeyword] = useState("");
    const [tempPantipPosts, setTempPantipPosts] = useState([]); // รายการโพสต์ที่ดึงมา
    const [tempMode, setTempMode] = useState(false); // เปิด/ปิดส่วน preview
    const [pantipLoading, setPantipLoading] = useState(false);
    const [savingPantip, setSavingPantip] = useState(false);

    // ดึงโพสต์จาก Pantip แบบ preview (ยังไม่ลง social_analysis)
    async function fetchPantipTemp() {
        if (!pantipKeyword.trim()) {
            alert("กรุณาใส่คำค้นหา Pantip");
            return;
        }

        try {
            setPantipLoading(true);
            setTempPantipPosts([]);
            setTempMode(false);

            const res = await fetch(
                `${API_BASE}/pantip/temp-fetch?keyword=${encodeURIComponent(
                    pantipKeyword
                )}`
            );

            if (!res.ok) {
                throw new Error("โหลดข้อมูลไม่สำเร็จ: " + res.status);
            }

            const data = await res.json();

            setTempPantipPosts(data);
            setTempMode(true);
        } catch (e) {
            console.error(e);
            alert("ดึงข้อมูล Pantip ไม่สำเร็จ");
        } finally {
            setPantipLoading(false);
        }
    }

    // วิเคราะห์ + บันทึกข้อมูลจาก temp ลง social_analysis ด้วย ONNX
    async function savePantipTemp() {
        try {
            setSavingPantip(true);

            // 1) บันทึกโพสต์ลง pantip_post / pantip_comment
            const resSave = await fetch(`${API_BASE}/pantip/save-temp`, {
                method: "POST",
            });
            if (!resSave.ok) {
                throw new Error("บันทึกไม่สำเร็จ: " + resSave.status);
            }
            const saveData = await resSave.json();

            // 2) ให้ ONNX วิเคราะห์เฉพาะ Pantip แล้วบันทึกลง social_analysis
            const resAnalyze = await fetch(`${API_BASE}/api/analysis/batch/pantip`, {
                method: "POST",
            });
            if (!resAnalyze.ok) {
                throw new Error("วิเคราะห์ไม่สำเร็จ: " + resAnalyze.status);
            }
            const analyzeData = await resAnalyze.json();

            alert(
                `บันทึกโพสต์ใหม่เข้าฐานข้อมูลแล้ว ${saveData.saved ?? 0} รายการ\n` +
                `สร้างผลวิเคราะห์ Pantip ใหม่ ${analyzeData.total ?? 0} รายการ\n\n` +
                "โพสต์จะไปแสดงในหน้ารายงานเหมือนข้อมูลอื่น ๆ"
            );

            setTempPantipPosts([]);
            setTempMode(false);
        } catch (e) {
            console.error(e);
            alert("บันทึก/วิเคราะห์ไม่สำเร็จ กรุณาลองใหม่");
        } finally {
            setSavingPantip(false);
        }
    }

    // ยกเลิก: ล้าง temp ใน backend, ไม่บันทึกลง social_analysis
    async function cancelPantipTemp() {
        try {
            const res = await fetch(`${API_BASE}/pantip/clear-temp`, {
                method: "POST",
            });

            if (!res.ok) {
                throw new Error("ยกเลิกไม่สำเร็จ: " + res.status);
            }

            alert("ยกเลิกแล้ว ข้อมูลจะไม่ถูกบันทึก");

            setTempPantipPosts([]);
            setTempMode(false);
        } catch (e) {
            console.error(e);
            alert("ยกเลิกไม่สำเร็จ กรุณาลองใหม่");
        }
    }

    /* --------------------------------------------------
     * 4) filter สำหรับตารางด้านล่าง (ตอนนี้ยังไม่มี data จริง)
     * -------------------------------------------------- */
    const filteredTrending = useMemo(() => {
        const needle = q.toLowerCase().trim();
        if (!needle) return trending;

        return trending.filter((p) =>
            (p.title || "").toLowerCase().includes(needle)
        );
    }, [q, trending]);

    /* --------------------------------------------------
     * 5) UI หลัก
     * -------------------------------------------------- */
    return (
        <div className="trends-layout">
            {/* ---------- Sidebar ---------- */}
            <aside className="sidebar">
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
                    <Link to="/settings" className="nav-item">
                        <span>Settings</span>
                    </Link>
                    <Link to="/trends2" className="nav-item active">
                        <span>Keywords</span>
                    </Link>
                </nav>
            </aside>

            {/* ---------- Main Content ---------- */}
            <main className="main-content">
                <div className="title-wrap">
                    <h1 className="page-title">Keywords</h1>

                    {/* ====== (1) ฟีเจอร์ Pantip (โหมดทดลอง) ====== */}
                    <section className="card" style={{ marginBottom: "20px" }}>
                        <h3 className="widget-title" style={{ marginBottom: "10px" }}>
                            ดึงข้อมูลจาก Pantip (โหมดทดลอง)
                        </h3>

                        {/* แถว input + ปุ่ม “ค้นหา Pantip” */}
                        <div
                            style={{
                                display: "flex",
                                gap: "10px",
                                flexWrap: "wrap",
                            }}
                        >
                            <input
                                value={pantipKeyword}
                                onChange={(e) => setPantipKeyword(e.target.value)}
                                placeholder="พิมพ์คำค้นหา Pantip เช่น หอการค้า"
                                style={{
                                    flex: "1",
                                    minWidth: "260px",
                                    padding: "8px 10px",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "10px",
                                }}
                            />

                            <button
                                onClick={fetchPantipTemp}
                                disabled={pantipLoading}
                                style={{
                                    padding: "8px 16px",
                                    background: "#2563eb",
                                    color: "white",
                                    borderRadius: "10px",
                                    border: "none",
                                    cursor: "pointer",
                                    fontWeight: "600",
                                    opacity: pantipLoading ? 0.7 : 1,
                                }}
                            >
                                {pantipLoading ? "กำลังดึง..." : "ค้นหา Pantip"}
                            </button>
                        </div>

                        {/* แสดง preview เฉพาะตอน tempMode = true */}
                        {tempMode && (
                            <div style={{ marginTop: "20px" }}>
                                <h4 style={{ marginBottom: "10px" }}>
                                    📌 ผลการดึงข้อมูลแบบยังไม่บันทึก (Preview)
                                </h4>

                                {/* ปุ่ม วิเคราะห์ / ยกเลิก */}
                                <div
                                    style={{
                                        display: "flex",
                                        gap: "10px",
                                        marginBottom: "12px",
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <button
                                        onClick={savePantipTemp}
                                        disabled={savingPantip}
                                        style={{
                                            padding: "8px 14px",
                                            background: "#16a34a",
                                            color: "white",
                                            borderRadius: "10px",
                                            border: "none",
                                            cursor: "pointer",
                                            fontWeight: "600",
                                            opacity: savingPantip ? 0.7 : 1,
                                        }}
                                    >
                                        {savingPantip ? "กำลังบันทึก..." : "✔ วิเคราะห์ / บันทึก"}
                                    </button>

                                    <button
                                        onClick={cancelPantipTemp}
                                        disabled={savingPantip}
                                        style={{
                                            padding: "8px 14px",
                                            background: "#dc2626",
                                            color: "white",
                                            borderRadius: "10px",
                                            border: "none",
                                            cursor: "pointer",
                                            fontWeight: "600",
                                        }}
                                    >
                                        ✖ ยกเลิก
                                    </button>
                                </div>

                                {/* รายการโพสต์ preview จาก temp */}
                                <div
                                    style={{
                                        maxHeight: "260px",
                                        overflowY: "auto",
                                    }}
                                >
                                    {pantipLoading ? (
                                        <div>กำลังดึงข้อมูลจาก Pantip...</div>
                                    ) : tempPantipPosts.length === 0 ? (
                                        <div>ไม่มีข้อมูล</div>
                                    ) : (
                                        tempPantipPosts.map((p, i) => (
                                            <div
                                                key={i}
                                                style={{
                                                    padding: "10px",
                                                    borderBottom: "1px solid #e2e8f0",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        fontWeight: "700",
                                                        color: "#0f172a",
                                                    }}
                                                >
                                                    {p.title}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: "14px",
                                                        color: "#475569",
                                                        marginBottom: "4px",
                                                    }}
                                                >
                                                    {p.preview || p.content?.slice(0, 100)}
                                                    ...
                                                </div>

                                                {p.url && (
                                                    <a
                                                        href={p.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        style={{
                                                            fontSize: "13px",
                                                            color: "#2563eb",
                                                            textDecoration: "underline",
                                                        }}
                                                    >
                                                        เปิดโพสต์ต้นฉบับบน Pantip
                                                    </a>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </section>

                    {/* ====== (2) ตาราง Keywords + ฟอร์มเพิ่มคำ ====== */}
                    <section className="card">
                        <div className="card-head">
                            <h3 className="widget-title">Trending Posts</h3>

                            <input
                                className="search"
                                placeholder="🔍 ค้นหา keyword"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                            />

                            <div className="custom-add-box">
                                <input
                                    value={word}
                                    onChange={(e) => setWord(e.target.value)}
                                    placeholder="เพิ่มคำเพื่อใช้ในการประมวลผล Sentiment"
                                />

                                <select
                                    value={label}
                                    onChange={(e) => setLabel(e.target.value)}
                                >
                                    <option value="positive">positive</option>
                                    <option value="neutral">neutral</option>
                                    <option value="negative">negative</option>
                                </select>

                                <button type="button" onClick={addKeyword}>
                                    เพิ่มคำ
                                </button>
                            </div>

                            {customKeywords.length > 0 && (
                                <div className="custom-keyword-list">
                                    <span>คำที่เพิ่มแล้ว:</span>
                                    <ul>
                                        {customKeywords.map((k) => (
                                            <li key={k.id}>
                                                <strong>{k.word}</strong> — {k.label}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div className="table">
                            <div className="t-head">
                                <div>id</div>
                                <div>Keyword</div>
                                <div>Sentiment</div>
                                <div>Phrase</div>
                            </div>

                            {filteredTrending.map((p) => (
                                <div className="t-row" key={p.id}>
                                    <div className="title-cell">{p.title}</div>
                                    <div>{p.date || "-"}</div>
                                    <div>{p.source}</div>
                                    <div>
                                        {p.url && p.url !== "#" ? (
                                            <a
                                                className="link"
                                                href={p.url}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                เปิดลิงก์
                                            </a>
                                        ) : (
                                            "-"
                                        )}
                                    </div>
                                </div>
                            ))}

                            {filteredTrending.length === 0 && (
                                <div className="empty-row">ไม่พบรายการ</div>
                            )}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
