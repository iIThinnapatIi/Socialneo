// src/Trends.jsx
import React, { useMemo, useState } from "react";
import "./Trends.css";
import { Link } from "react-router-dom";
import { useFetch } from "./hooks/useFetch";
import { getTweetAnalysis } from "./services/api";

/* ---------- helpers ---------- */
const pickDate = (r) =>
    (r.analyzedAt || r.createdAt || r.crawlTime || "")
        .toString()
        .slice(0, 10);

const parseTopics = (r) => {
    if (Array.isArray(r.topics) && r.topics.length) return r.topics;

    const tj = r.topicsJson;
    if (!tj) return [];

    const str = String(tj).trim();
    if (str.startsWith("[") || str.startsWith("{")) {
        try {
            const arr = JSON.parse(str);
            if (Array.isArray(arr)) return arr.map(String);
        } catch (_) {}
    }
    return str
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
};

// STOP Words
const STOP = new Set([
    "the", "a", "an", "of", "and", "or", "to", "in", "on", "for", "with", "at", "by", "is", "are", "am",
    "ค่ะ","คะ","ครับ","และ","หรือ","ที่","ว่า","เป็น","มี","ให้","ได้","ไป","มา","แล้ว","เลย","ก็",
    "อยู่","เรา","คุณ","เขา","จาก","ถึง","กับ","ใน","บน","ของ","ว่า",
]);

const tokenizeText = (t = "") =>
    t.toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter(Boolean)
        .filter((w) => w.length > 1 && !STOP.has(w));

export default function Trends() {
    /* ---------- ดึงข้อมูลจริงจาก backend ---------- */
    const { data, loading, err } = useFetch(() => getTweetAnalysis(), []);
    const rows = data || [];

    /* ---------- search box ของ Trending Posts ---------- */
    const [q, setQ] = useState("");

    /* ---------- Custom Keywords (เพิ่มคำใหม่เข้า backend) ---------- */
    const [word, setWord] = useState("");
    const [label, setLabel] = useState("negative");

    const addKeyword = async () => {
        if (!word.trim()) return alert("กรุณาใส่คำก่อน");

        await fetch("http://localhost:8082/custom-keywords/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ keyword: word, sentiment: label }),
        });

        alert("เพิ่มคำสำเร็จ");
        setWord("");
    };

    /* ---------- สร้าง Top Keywords จากข้อมูลทั้งหมด ---------- */
    const { keywordsTop10, totalMentions } = useMemo(() => {
        const freq = new Map();
        let count = 0;

        for (const r of rows) {
            count++;

            const topics = parseTopics(r);
            if (topics.length) {
                for (const t of topics) {
                    const k = t.trim();
                    if (!k) continue;
                    freq.set(k, (freq.get(k) || 0) + 1);
                }
            } else if (r.text) {
                for (const w of tokenizeText(r.text)) {
                    freq.set(w, (freq.get(w) || 0) + 1);
                }
            }
        }

        const top = Array.from(freq.entries())
            .map(([k, v]) => ({ keyword: k, count: v }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return { keywordsTop10: top, totalMentions: count };
    }, [rows]);

    /* ---------- เลือกโพสต์จริงมาเป็น Trending Posts ---------- */
    const trendingPosts = useMemo(() => {
        const topSet = new Set(keywordsTop10.map((x) => x.keyword));
        const pickedByKey = new Map();

        for (const r of rows) {
            const ts = parseTopics(r);
            const titleCand =
                (ts && ts.length ? ts.join(", ") : (r.text || "").slice(0, 60)) ||
                "โพสต์เกี่ยวกับ";
            const d = pickDate(r);
            const url = r.tweetId
                ? `https://x.com/i/web/status/${r.tweetId}`
                : "#";

            const apply = (kw) => {
                const prev = pickedByKey.get(kw);
                if (!prev || String(d).localeCompare(prev.date) > 0) {
                    pickedByKey.set(kw, {
                        id: r.id ?? r.tweetId ?? `${kw}-${d}`,
                        title: titleCand,
                        date: d,
                        source: r.source || "X",
                        url,
                    });
                }
            };

            if (ts.length) {
                ts.forEach((k) => {
                    if (topSet.has(k)) apply(k);
                });
            } else if (r.text) {
                for (const w of tokenizeText(r.text)) {
                    if (topSet.has(w)) apply(w);
                }
            }
        }

        const list = Array.from(pickedByKey.values())
            .sort((a, b) => String(b.date).localeCompare(String(a.date)))
            .slice(0, 10);

        // ถ้ายังไม่มีอะไรเลย ให้หยิบโพสต์ล่าสุด 5 อันมาแทน
        if (list.length === 0) {
            return [...rows]
                .sort((a, b) =>
                    String(pickDate(b)).localeCompare(String(pickDate(a)))
                )
                .slice(0, 5)
                .map((r, i) => ({
                    id: r.id ?? r.tweetId ?? i,
                    title:
                        parseTopics(r).join(", ") ||
                        (r.text ? r.text.slice(0, 60) : "โพสต์"),
                    date: pickDate(r),
                    source: r.source || "X",
                    url: r.tweetId
                        ? `https://x.com/i/web/status/${r.tweetId}`
                        : "#",
                }));
        }

        return list;
    }, [rows, keywordsTop10]);

    /* ---------- filter Trending Posts ด้วยช่องค้นหา q ---------- */
    const filteredTrending = useMemo(() => {
        const qq = q.trim().toLowerCase();
        if (!qq) return trendingPosts;

        return trendingPosts.filter((p) =>
            `${p.title} ${p.source}`.toLowerCase().includes(qq)
        );
    }, [q, trendingPosts]);

    /* ---------- UI ---------- */
    return (
        <div className="trends-layout">
            {/* Sidebar */}
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
                        <i className="far fa-chart-line"></i>
                        <span>Dashboard</span>
                    </Link>
                    <Link to="/mentions" className="nav-item">
                        <i className="fas fa-comment-dots"></i>
                        <span>Mentions</span>
                    </Link>
                    <Link to="/trends" className="nav-item active">
                        <i className="fas fa-stream"></i>
                        <span>Trends</span>
                    </Link>
                    <Link to="/settings" className="nav-item">
                        <i className="fas fa-cog"></i>
                        <span>Settings</span>
                    </Link>
                    <Link to="/trends2" className="nav-item">
                        <span>Keywords</span>
                    </Link>
                </nav>
            </aside>

            {/* Content */}
            <main className="main-content">
                <header className="page-header">
                    <div className="title-wrap">
                        <h1 className="page-title">Trends</h1>
                        <div className="page-sub">
                            * ดึงจากฐานข้อมูล <b>tweet_analysis</b> ·
                            รวมทั้งหมด {totalMentions} รายการ
                        </div>
                    </div>
                </header>

                <div className="content-wrap">
                    {/* ---------- Trending Posts ---------- */}
                    <section className="card">
                        <div className="card-head">
                            <h3 className="widget-title">Trending Posts</h3>

                            {/* search box */}
                            <input
                                className="search"
                                placeholder="🔍 ค้นหาโพสต์"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                            />

                            {/* ฟอร์มเพิ่ม custom keyword ส่งไป backend */}
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

                                <button onClick={addKeyword}>เพิ่มคำ</button>
                            </div>
                        </div>

                        {err && (
                            <div className="error-card">
                                โหลดข้อมูลไม่สำเร็จ: {String(err)}
                            </div>
                        )}

                        {loading ? (
                            <div className="placeholder">กำลังโหลด...</div>
                        ) : (
                            <div className="table">
                                <div className="t-head">
                                    <div>Title</div>
                                    <div>Date</div>
                                    <div>Source</div>
                                    <div>Link</div>
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
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}
