// src/Dashboard.jsx
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import "./Dashboard.css";
import { useFetch } from "./hooks/useFetch";
import {
    getTweetAnalysis,
    getTweetDates,
    getAnalysisSummary,
} from "./services/api";

import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
} from "recharts";

/* ---------- theme colors ---------- */
const COLORS = {
    green: "#22C55E",
    red: "#EF4444",
    gray: "#94A3B8",
};

// สีสวยสำหรับกราฟคณะ TOP
const FACULTY_COLORS = [
    "#3B82F6", // ฟ้า
    "#22C55E", // เขียว
    "#F97316", // ส้ม
    "#E11D48", // ชมพูแดง
    "#6366F1", // ม่วงฟ้า
    "#0EA5E9", // ฟ้าน้ำทะเล
];

/* ---------- Badge ---------- */
function SentimentBadge({ label }) {
    const lbl = (label || "").toLowerCase();
    const norm =
        lbl === "positive"
            ? "positive"
            : lbl === "negative"
                ? "negative"
                : "neutral";
    return <span className={`pill pill-${norm}`}>{norm}</span>;
}

const clip = (s, n = 60) =>
    s && s.length > n ? s.slice(0, n) + "…" : s || "-";

export default function Dashboard() {
    const { data, loading} = useFetch(() => getTweetAnalysis(), []);
    const rows = data || [];

    const { data: tweetDates } = useFetch(() => getTweetDates(), []);
    const { data: summary } = useFetch(() => getAnalysisSummary(), []);

    // Normalize
    const normRows = useMemo(() => {
        return rows.map((r, idx) => ({
            tweetId: r.tweetId || r.id || String(idx),
            title: clip(r.text || "-", 80),
            faculty: r.faculty || "ไม่ระบุ",
            sentiment:
                r.sentimentLabel?.toLowerCase() === "positive"
                    ? "positive"
                    : r.sentimentLabel?.toLowerCase() === "negative"
                        ? "negative"
                        : "neutral",
            date: (r.analyzedAt || r.createdAt || "").slice(0, 10),
            source: r.source || "X",
            url: r.tweetId ? `https://x.com/i/web/status/${r.tweetId}` : "-",
        }));
    }, [rows]);

    // Local fallback
    const { totalsLocal, topFacultiesLocal, latestItems, sentShareLocal } =
        useMemo(() => {
            let pos = 0,
                neu = 0,
                neg = 0;

            const facCount = new Map();

            for (const m of normRows) {
                if (m.sentiment === "positive") pos++;
                else if (m.sentiment === "negative") neg++;
                else neu++;

                facCount.set(m.faculty, (facCount.get(m.faculty) || 0) + 1);
            }

            const topFaculties = Array.from(facCount.entries())
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count);

            const latestItems = [...normRows]
                .filter((m) => ["positive", "negative"].includes(m.sentiment))
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 5);

            return {
                totalsLocal: {
                    mentions: normRows.length,
                    positive: pos,
                    neutral: neu,
                    negative: neg,
                },
                topFacultiesLocal: topFaculties,
                latestItems,
                sentShareLocal: [
                    { name: "Positive", value: pos, color: COLORS.green },
                    { name: "Neutral", value: neu, color: COLORS.gray },
                    { name: "Negative", value: neg, color: COLORS.red },
                ],
            };
        }, [normRows]);

    // Use backend summary first
    const totals = summary?.totals || totalsLocal;

    const sentShare = summary?.sentiment
        ? [
            {
                name: "Positive",
                value:
                    summary.sentiment.find((s) => s.label === "Positive")
                        ?.value ?? 0,
                color: COLORS.green,
            },
            {
                name: "Neutral",
                value:
                    summary.sentiment.find((s) => s.label === "Neutral")
                        ?.value ?? 0,
                color: COLORS.gray,
            },
            {
                name: "Negative",
                value:
                    summary.sentiment.find((s) => s.label === "Negative")
                        ?.value ?? 0,
                color: COLORS.red,
            },
        ]
        : sentShareLocal;

    const topFaculties =
        summary?.topFaculties?.length > 0
            ? summary.topFaculties
            : topFacultiesLocal;

    // ใช้กับกราฟ (เรียงใหม่)
    const facultyChartData = useMemo(
        () => [...topFaculties].reverse(),
        [topFaculties]
    );

    // Trend
    const trendData = useMemo(() => {
        if (summary?.trend) return summary.trend;

        if (!Array.isArray(tweetDates)) return [];
        const map = new Map();

        tweetDates.forEach((d) => {
            const date = d.slice(0, 10);
            map.set(date, (map.get(date) || 0) + 1);
        });

        return [...map.entries()].map(([date, count]) => ({
            date,
            count,
        }));
    }, [summary, tweetDates]);

    return (
        <div className="dashboard-container">
            {/* Sidebar */}
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
                    <Link to="/dashboard" className="nav-item active">
                        Dashboard
                    </Link>
                    <Link to="/mentions" className="nav-item">
                        Mentionsผ
                    </Link>
                    <Link to="/trends" className="nav-item">
                        Trends
                    </Link>
                    <Link to="/trends2" className="nav-item">
                        Keywords
                    </Link>
                    <Link to="/model-eval" className="nav-item">
                        <span>Model Eval</span>
                    </Link>
                </nav>
            </div>

            {/* Main */}
            <div className="main-content">
                <header className="main-header">
                    <h1 className="header-title">Dashboard</h1>
                </header>

                <main className="widgets-grid">
                    {/* Total + Sentiment */}
                    <div className="widget-metrics">
                        <div className="metric-card">
                            <div className="metric-title">Total Mentions</div>
                            <div className="metric-value">
                                {loading ? "…" : totals.mentions}
                            </div>
                            <div className="metric-sub">
                                POS {totals.positive} · NEU {totals.neutral} ·
                                NEG {totals.negative}
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-title">Sentiment Overview</div>

                            <ResponsiveContainer width="100%" height={150}>
                                <PieChart>
                                    <Pie
                                        data={sentShare}
                                        dataKey="value"
                                        innerRadius={40}
                                        outerRadius={60}
                                    >
                                        {sentShare.map((e, i) => (
                                            <Cell key={i} fill={e.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Trend */}
                    <div className="widget-card widget-trend">
                        <h3 className="widget-title">Mentions Trend</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#2563eb"
                                    dot
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Top Faculties — ใส่สีใหม่ */}
                    <div className="widget-card widget-faculty">
                        <h3 className="widget-title">Top Faculties</h3>

                        {facultyChartData.length === 0 ? (
                            <p
                                style={{
                                    marginTop: 24,
                                    color: "#999",
                                    textAlign: "center",
                                }}
                            >
                                ยังไม่มีข้อมูลคณะ
                            </p>
                        ) : (
                            <div
                                style={{
                                    width: "100%",
                                    height: Math.max(
                                        facultyChartData.length * 45,
                                        200
                                    ),
                                }}
                            >
                                <ResponsiveContainer>
                                    <BarChart
                                        data={facultyChartData}
                                        layout="vertical"
                                        margin={{
                                            top: 10,
                                            right: 20,
                                            left: 40,
                                            bottom: 10,
                                        }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" />
                                        <YAxis
                                            type="category"
                                            dataKey="name"
                                            width={180}
                                        />
                                        <Tooltip />

                                        <Bar dataKey="count" radius={[6, 6, 6, 6]}>
                                            {facultyChartData.map(
                                                (entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={
                                                            FACULTY_COLORS[
                                                            index %
                                                            FACULTY_COLORS.length
                                                                ]
                                                        }
                                                    />
                                                )
                                            )}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* Latest */}
                    <div className="widget-card widget-latest">
                        <h3 className="widget-title">
                            Latest 5 Positive & Negative Mentions
                        </h3>

                        <div className="table">
                            <div className="t-head">
                                <div>Title</div>
                                <div>Faculty</div>
                                <div>Sentiment</div>
                                <div>Date</div>
                                <div>Source</div>
                            </div>

                            {latestItems.map((m, idx) => (
                                <div className="t-row" key={idx}>
                                    <div className="t-title">
                                        {clip(m.title, 50)}
                                    </div>
                                    <div>{m.faculty}</div>
                                    <div>
                                        <SentimentBadge label={m.sentiment} />
                                    </div>
                                    <div>{m.date}</div>
                                    <div>
                                        <a
                                            className="link"
                                            href={m.url}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            เปิดลิงก์
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
