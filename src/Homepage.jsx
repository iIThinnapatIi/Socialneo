// src/Homepage.jsx
import React, { useMemo, useState, useEffect } from "react";
import "./Homepage.css";
import { Link } from "react-router-dom";

// ================== API / Hooks ==================
import { API_BASE, API_PREFIX, getTweetAnalysis } from "./services/api";
import { useFetch } from "./hooks/useFetch";

// ================== Components ==================
import FiltersBar from "./components/FiltersBar";
import SentimentOverview from "./components/SentimentOverview";
import MentionsTrend from "./components/MentionsTrend";
import MetricsRow from "./components/MetricsRow";

// ================== Excel Lib ==================
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/* ================== HELPERS ================== */
const normSent = (s = "") => {
    const x = s.toLowerCase();
    if (x === "pos" || x === "positive") return "positive";
    if (x === "neg" || x === "negative") return "negative";
    return "neutral";
};

const pickDate = (r) =>
    (r.analyzedAt || r.createdAt || r.crawlTime || "")
        .toString()
        .slice(0, 10);

const normalizeFaculty = (f = "") => {
    if (!f) return "มหาวิทยาลัยโดยรวม";

    const x = f.replace(/\s+/g, "").toLowerCase();

    // ✅ เคสใหม่: บุคคลทั่วไป
    if (x.includes("บุคคลทั่วไป")) return "บุคคลทั่วไป";

    if (x.includes("บัญชี")) return "บัญชี";
    if (x.includes("บริการ")) return "ศูนย์บริการ";
    if (x.includes("นิเทศ")) return "นิเทศศาสตร์";
    if (x.includes("บริหาร") || x.includes("จัดการ") || x.includes("ธุรกิจ"))
        return "บริหารธุรกิจ";
    if (x.includes("มหาวิทยาลัย") || x.includes("utcc"))
        return "มหาวิทยาลัยโดยรวม";
    if (x.includes("วิทยา") || x.includes("วิทย์")) return "วิทยาศาสตร์";
    if (x.includes("มนุษ")) return "มนุษย์ศาสตร์";
    if (x.includes("ตลาด")) return "การตลาด";
    if (x.includes("ทุน")) return "ทุนมหาลัย";
    if (x.includes("เศรษ")) return "เศรษฐศาสตร์";
    if (x.includes("โลจิส")) return "โลจิสติกส์";
    if (x.includes("กยศ") || x.includes("กยส")) return "กยส";

    return "มหาวิทยาลัยโดยรวม";
};

/* ================== MAIN COMPONENT ================== */
function Homepage() {
    // ---------- state สำหรับตัวกรอง ----------
    const [q, setQ] = useState("");
    const [faculty, setFaculty] = useState("ทั้งหมด");
    const [sent, setSent] = useState("ทั้งหมด");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");

    const faculties = [
        "ทั้งหมด",
        "บริหารธุรกิจ",
        "วิทยาศาสตร์",
        "นิติศาสตร์",
        "บัญชี",
        "ท่องเที่ยว",
        "เศรษฐศาสตร์",
        "โลจิสติกส์",
        "มนุษย์ศาสตร์",
        "การตลาด",
        "ทุนมหาลัย",
        "กยส",
        "ศูนย์บริการ",
        "มหาวิทยาลัยโดยรวม",
        "บุคคลทั่วไป",          // ✅ ตัวเลือกใหม่
    ];

    // ✅ ใช้ list นี้สำหรับ dropdown ในตาราง (ไม่เอา "ทั้งหมด")
    const facultyOptions = faculties.filter((f) => f !== "ทั้งหมด");

    // ---------- ดึงข้อมูลจาก backend ----------
    const { data, loading } = useFetch(() => getTweetAnalysis(), []);
    const [rows, setRows] = useState([]);

    useEffect(() => {
        if (data) setRows(data);
    }, [data]);

    // ---------- อัปเดต sentiment ทีละแถว ----------
    const updateSentiment = async (id, newValue) => {
        try {
            setRows((prev) =>
                prev.map((r) =>
                    r.id === id ? { ...r, sentimentLabel: newValue } : r
                )
            );

            await fetch(
                `${API_BASE}${API_PREFIX}/analysis/sentiment/update/${id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sentiment: newValue }),
                }
            );
        } catch (e) {
            console.error(e);
            alert("อัปเดต Sentiment ไม่สำเร็จ");
        }
    };

    // ---------- ✅ อัปเดตคณะทีละแถว ----------
    const updateFaculty = async (id, newFaculty) => {
        try {
            // อัปเดตบนหน้าจอก่อน
            setRows((prev) =>
                prev.map((r) =>
                    r.id === id ? { ...r, faculty: newFaculty } : r
                )
            );

            // ยิงไป backend
            await fetch(
                `${API_BASE}${API_PREFIX}/analysis/faculty/update/${id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ faculty: newFaculty }),
                }
            );
        } catch (e) {
            console.error(e);
            alert("อัปเดตคณะไม่สำเร็จ");
        }
    };

    // ---------- FILTER ข้อมูล ----------
    const filtered = useMemo(() => {
        return rows.filter((r) => {
            const facNorm = normalizeFaculty(r.faculty);
            const s = normSent(r.sentimentLabel);
            const day = new Date(pickDate(r));

            if (faculty !== "ทั้งหมด" && facNorm !== faculty) return false;
            if (sent !== "ทั้งหมด" && s !== sent) return false;
            if (from && day < new Date(from)) return false;
            if (to && day > new Date(to)) return false;

            if (q) {
                const text = `${r.text} ${r.faculty}`.toLowerCase();
                if (!text.includes(q.toLowerCase())) return false;
            }
            return true;
        });
    }, [rows, q, faculty, sent, from, to]);

    // ---------- SUMMARY ----------
    const total = filtered.length;
    let pos = 0,
        neg = 0,
        neu = 0;

    filtered.forEach((r) => {
        const s = normSent(r.sentimentLabel);
        if (s === "positive") pos++;
        else if (s === "negative") neg++;
        else neu++;
    });

    // ---------- Trend data ----------
    const trendData = useMemo(() => {
        const counter = {};
        filtered.forEach((r) => {
            const d = pickDate(r);
            if (!d) return;
            if (!counter[d]) counter[d] = 0;
            counter[d]++;
        });
        return Object.entries(counter).map(([date, count]) => ({ date, count }));
    }, [filtered]);

    // ---------- Export Excel ----------
    const exportExcel = () => {
        const flat = filtered.map((r) => ({
            ID: r.id,
            Topics: r.text,
            Faculty: normalizeFaculty(r.faculty),
            Sentiment: normSent(r.sentimentLabel),
            Source: r.source,
            Date: pickDate(r),
            Link: r.tweetId ? `https://x.com/i/web/status/${r.tweetId}` : "-",
        }));

        const ws = XLSX.utils.json_to_sheet(flat);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sentiment");

        const excelBuffer = XLSX.write(wb, {
            bookType: "xlsx",
            type: "array",
        });

        saveAs(
            new Blob([excelBuffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            }),
            "sentiment_report.xlsx"
        );
    };

    const mappedSentiment = filtered.map((r) => ({
        id: r.id,
        topics: r.text,
        faculty: normalizeFaculty(r.faculty),
        sentiment: normSent(r.sentimentLabel),
        source: r.source,
        date: pickDate(r),
        url: r.tweetId ? `https://x.com/i/web/status/${r.tweetId}` : "-",
    }));

    const resetFilters = () => {
        setQ("");
        setFaculty("ทั้งหมด");
        setSent("ทั้งหมด");
        setFrom("");
        setTo("");
    };

    /* ================== RENDER UI ================== */
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
                    <Link to="/mentions" className="nav-item active">
                        <span>Mentions</span>
                    </Link>
                    <Link to="/trends" className="nav-item">
                        <span>Trends</span>
                    </Link>
                    <Link to="/trends2" className="nav-item">
                        <span>Keywords</span>
                    </Link>
                </nav>
            </div>

            {/* ===== Main Content ===== */}
            <div className="main-content">
                <header className="main-header">
                    <div className="header-left">
                        <h1>Mentions & Sentiment</h1>
                        <div>
                            ผลลัพธ์ทั้งหมด <b>{total}</b> รายการ
                        </div>
                    </div>

                    <div className="header-right">
                        <button className="btn ghost" onClick={resetFilters}>
                            รีเซ็ตตัวกรอง
                        </button>
                        <button className="btn primary" onClick={exportExcel}>
                            Export Excel
                        </button>
                    </div>
                </header>

                <div className="filters-sticky">
                    <FiltersBar
                        q={q}
                        setQ={setQ}
                        faculty={faculty}
                        setFaculty={setFaculty}
                        sent={sent}
                        setSent={setSent}
                        from={from}
                        setFrom={setFrom}
                        to={to}
                        setTo={setTo}
                        faculties={faculties}
                        onReset={resetFilters}
                    />
                </div>

                <section className="kpi-grid">
                    <div className="kpi-card pos">
                        <div className="kpi-title">Positive</div>
                        <div className="kpi-value">{pos}</div>
                    </div>
                    <div className="kpi-card neu">
                        <div className="kpi-title">Neutral</div>
                        <div className="kpi-value">{neu}</div>
                    </div>
                    <div className="kpi-card neg">
                        <div className="kpi-title">Negative</div>
                        <div className="kpi-value">{neg}</div>
                    </div>
                </section>

                <main className="homepage-widgets">
                    <SentimentOverview
                        data={[
                            { name: "Positive", value: pos },
                            { name: "Neutral", value: neu },
                            { name: "Negative", value: neg },
                        ]}
                    />
                    <MentionsTrend data={trendData} />
                    <MetricsRow total={total} />
                </main>

                <section className="card">
                    <h3>รายการโพสต์ตาม Sentiment ({total})</h3>

                    {loading ? (
                        <div className="placeholder">กำลังโหลด...</div>
                    ) : (
                        <div className="table">
                            <div className="t-head">
                                <div>ID</div>
                                <div>Topics</div>
                                <div>Faculty</div>
                                <div>Sentiment</div>
                                <div>Source</div>
                                <div>Date</div>
                                <div>Link</div>
                            </div>

                            {mappedSentiment.map((m, index) => (
                                <div className="t-row" key={`${m.id}-${index}`}>
                                    <div>{m.id}</div>
                                    <div>{m.topics}</div>

                                    {/* ✅ เปลี่ยน Faculty เป็น select ให้ผู้ใช้เลือกคณะเองได้ */}
                                    <div>
                                        <select
                                            value={m.faculty}
                                            onChange={(e) =>
                                                updateFaculty(m.id, e.target.value)
                                            }
                                        >
                                            {facultyOptions.map((f) => (
                                                <option key={f} value={f}>
                                                    {f}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* dropdown แก้ sentiment */}
                                    <div>
                                        <select
                                            value={m.sentiment}
                                            onChange={(e) =>
                                                updateSentiment(m.id, e.target.value)
                                            }
                                        >
                                            <option value="positive">positive</option>
                                            <option value="neutral">neutral</option>
                                            <option value="negative">negative</option>
                                        </select>
                                    </div>

                                    <div>{m.source}</div>
                                    <div>{m.date}</div>

                                    <div>
                                        {m.url !== "-" ? (
                                            <a
                                                href={m.url}
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
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

export default Homepage;
