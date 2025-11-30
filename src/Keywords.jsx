// src/Keywords.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./Trends.css";
import { Link } from "react-router-dom";

// ใช้ API_BASE + ฟังก์ชันจาก services/api
import {
    API_BASE,
    getCustomKeywords,
    createCustomKeyword,
} from "./services/api";

/**
 * หน้า Keywords
 * - ด้านบน: ดึงโพสต์จาก Pantip แบบทดลอง (preview ก่อนบันทึก)
 * - ด้านล่าง: จัดการ custom keyword (เพิ่ม / ลบ / ค้นหา)
 */
export default function Keyword() {
    /* --------------------------------------------------
     * 1) STATE สำหรับฝั่ง keyword
     * -------------------------------------------------- */
    const [q, setQ] = useState(""); // คำค้นในช่อง search

    const [word, setWord] = useState("");
    const [label, setLabel] = useState("positive");
    const [customKeywords, setCustomKeywords] = useState([]);
    const [savingKeyword, setSavingKeyword] = useState(false);

    // โหลด keyword ทั้งหมดจาก DB ตอนเปิดหน้า
    useEffect(() => {
        getCustomKeywords()
            .then((data) => {
                // data = [{id, keyword, sentiment}, ...]
                setCustomKeywords(
                    data.map((item) => ({
                        id: item.id,
                        word: item.keyword,
                        label: item.sentiment,
                    }))
                );
            })
            .catch((err) => {
                console.error("โหลด custom keywords ไม่สำเร็จ:", err);
            });
    }, []);

    // list ที่ผ่านการ search แล้ว
    const filteredKeywords = useMemo(() => {
        const needle = q.toLowerCase().trim();
        if (!needle) return customKeywords;
        return customKeywords.filter((k) =>
            k.word.toLowerCase().includes(needle)
        );
    }, [q, customKeywords]);

    // เพิ่ม keyword ลง DB + อัปเดต state
    const addKeyword = async () => {
        const clean = word.trim();
        if (!clean) return;

        try {
            setSavingKeyword(true);

            const saved = await createCustomKeyword({
                keyword: clean, // ให้ตรงกับ field ใน entity
                sentiment: label,
            }); // saved = {id, keyword, sentiment}

            setCustomKeywords((prev) => [
                ...prev,
                {
                    id: saved.id,
                    word: saved.keyword,
                    label: saved.sentiment,
                },
            ]);

            setWord("");
            setLabel("positive");

            console.log("เพิ่มคำใหม่ (บันทึกลง DB แล้ว):", saved);
        } catch (err) {
            console.error("บันทึก custom keyword ไม่สำเร็จ:", err);
            alert("บันทึกคำไม่สำเร็จ กรุณาลองใหม่");
        } finally {
            setSavingKeyword(false);
        }
    };

    // ลบ keyword ออกจาก DB + อัปเดต state
    const handleDeleteKeyword = async (id) => {
        const ok = window.confirm("ต้องการลบคำนี้จริง ๆ หรือไม่?");
        if (!ok) return;

        try {
            await fetch(`${API_BASE}/api/custom-keywords/${id}`, {
                method: "DELETE",
            });

            // ลบออกจาก state ฝั่งหน้าเว็บ
            setCustomKeywords((prev) => prev.filter((k) => k.id !== id));
        } catch (err) {
            console.error("Delete keyword error", err);
            alert("ลบคำไม่สำเร็จ ลองใหม่อีกครั้ง");
        }
    };

    /* --------------------------------------------------
     * 2) ฟีเจอร์ Pantip (โหมดทดลอง)
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
            const resAnalyze = await fetch(
                `${API_BASE}/api/analysis/batch/pantip`,
                {
                    method: "POST",
                }
            );
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
     * 3) UI หลัก
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
                            ดึงข้อมูลจาก Pantip
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

                    {/* ====== (2) ส่วนจัดการ Keywords ====== */}
                    <section className="card keyword-card">
                        {/* หัวการ์ด */}
                        <div className="keyword-header">
                            <div>
                                <h3 className="widget-title">Custom Keywords</h3>
                                <p className="keyword-subtitle">npm
                                </p>
                            </div>

                            <div className="keyword-search-wrap">
                                <input
                                    className="keyword-search"
                                    placeholder="🔍 ค้นหาคำที่สร้างไว้"
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* ฟอร์มเพิ่มคำ */}
                        <div className="keyword-add-row">
                            <input
                                className="keyword-input"
                                value={word}
                                onChange={(e) => setWord(e.target.value)}
                                placeholder="พิมพ์คำที่ต้องการเพิ่ม เช่น เบื่อ, ดีย์, ชอบมาก"
                            />

                            <select
                                className="keyword-select"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                            >
                                <option value="positive">positive</option>
                                <option value="neutral">neutral</option>
                                <option value="negative">negative</option>
                            </select>

                            <button
                                type="button"
                                className="keyword-add-btn"
                                onClick={addKeyword}
                                disabled={savingKeyword}
                            >
                                {savingKeyword ? "กำลังเพิ่ม..." : "เพิ่มคำ"}
                            </button>
                        </div>

                        {/* ตารางคำทั้งหมด */}
                        <div className="keyword-table-wrap">
                            {filteredKeywords.length === 0 ? (
                                <div className="keyword-empty">
                                    ยังไม่มีคำที่เพิ่มไว้ ลองเพิ่มคำใหม่ด้านบน
                                </div>
                            ) : (
                                <table className="keyword-table">
                                    <thead>
                                    <tr>
                                        <th style={{ width: "70px" }}>ID</th>
                                        <th>Keyword</th>
                                        <th style={{ width: "120px" }}>Sentiment</th>
                                        <th style={{ width: "90px" }}>จัดการ</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {filteredKeywords.map((k) => (
                                        <tr key={k.id}>
                                            <td>{k.id}</td>
                                            <td>{k.word}</td>
                                            <td>
                          <span className={`sentiment-pill ${k.label}`}>
                            {k.label}
                          </span>
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="keyword-delete-btn"
                                                    onClick={() => handleDeleteKeyword(k.id)}
                                                >
                                                    ลบ
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
