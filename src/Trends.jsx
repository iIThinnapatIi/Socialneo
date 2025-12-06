// src/Trends.jsx
import React, { useMemo, useState } from "react";
import "./Trends.css";
import { Link } from "react-router-dom";
import { useFetch } from "./hooks/useFetch";
import { getTweetAnalysis } from "./services/api";

// Recharts
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    BarChart,
    Bar,
} from "recharts";

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
            // eslint-disable-next-line no-unused-vars
        } catch (_) {
            /* empty */
        }
    }
    return str
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
};

const toDate = (s) => {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
};

const pickSentKey = (r) => {
    const raw = (r.sentimentLabel || r.sentiment || "").toLowerCase();
    if (raw.startsWith("pos")) return "pos";
    if (raw.startsWith("neg")) return "neg";
    return "neu";
};

const pickUrl = (r) =>
    r.url ||
    r.postUrl ||
    r.link ||
    r.pantipUrl ||
    r.pantipLink ||
    r.postLink ||
    r.originalUrl ||
    r.originUrl ||
    (r.tweetId ? `https://x.com/i/web/status/${r.tweetId}` : "");

// เดา faculty จาก field ต่าง ๆ ที่อาจมีอยู่
const pickFaculty = (r) =>
    r.facultyFinal ||
    r.facultyOverride ||
    r.faculty ||
    r.facultyLabel ||
    r.major ||
    "ไม่ระบุ";

// เดา source/channel
const pickSource = (r) =>
    r.source ||
    r.platform ||
    r.channel ||
    r.type ||
    r.tableName ||
    "ไม่ระบุ";

/* summary sentiment */
const makeSentimentSummary = (rows) => {
    let pos = 0,
        neu = 0,
        neg = 0;

    for (const r of rows) {
        const s = r._sentKey;
        if (s === "pos") pos++;
        else if (s === "neg") neg++;
        else neu++;
    }
    const total = pos + neu + neg;
    if (total === 0) {
        return {
            pos,
            neu,
            neg,
            total: 0,
            posPct: 0,
            neuPct: 0,
            negPct: 0,
        };
    }
    return {
        pos,
        neu,
        neg,
        total,
        posPct: Math.round((pos / total) * 100),
        neuPct: Math.round((neu / total) * 100),
        negPct: Math.round((neg / total) * 100),
    };
};

export default function Trends() {
    /* ---------- ดึงข้อมูลจาก backend ---------- */
    const { data, loading, err } = useFetch(() => getTweetAnalysis(), []);
    const rawRows = data || [];

    /* ---------- enrich row ครั้งเดียว ใช้ทั้งหน้า ---------- */
    const enrichedRows = useMemo(
        () =>
            rawRows.map((r) => {
                const dateStr = pickDate(r);
                const dateObj = toDate(dateStr);
                const sentKey = pickSentKey(r);
                const faculty = pickFaculty(r);
                const topics = parseTopics(r);
                const source = pickSource(r);
                const url = pickUrl(r);
                return {
                    ...r,
                    _dateStr: dateStr,
                    _dateObj: dateObj,
                    _sentKey: sentKey,
                    _faculty: faculty,
                    _topics: topics,
                    _source: source,
                    _url: url,
                };
            }),
        [rawRows]
    );

    /* ---------- state ---------- */
    const [q, setQ] = useState("");
    const [dateRange, setDateRange] = useState("30d"); // all | 7d | 30d | 90d
    const [sentimentFilter, setSentimentFilter] = useState("all"); // all | pos | neu | neg
    const [facultyFilter, setFacultyFilter] = useState("all");
    const [selectedPost, setSelectedPost] = useState(null);

    /* ---------- แบ่งช่วงเวลา -> ปัจจุบัน / ก่อนหน้า ---------- */
    const { rowsCurrent, rowsPrev, totalInFilter } = useMemo(() => {
        const now = new Date();
        const msDay = 24 * 60 * 60 * 1000;
        let rangeDays = 0;
        if (dateRange === "7d") rangeDays = 7;
        else if (dateRange === "30d") rangeDays = 30;
        else if (dateRange === "90d") rangeDays = 90;

        let startCurrent = null;
        let startPrev = null;

        if (rangeDays > 0) {
            startCurrent = new Date(now.getTime() - rangeDays * msDay);
            startPrev = new Date(now.getTime() - 2 * rangeDays * msDay);
        }

        const current = [];
        const prev = [];

        for (const r of enrichedRows) {
            const d = r._dateObj;
            if (!startCurrent || !d) {
                // ถ้าเลือก "ทั้งหมด" หรือไม่มีวันที่ -> ใส่ช่วงปัจจุบัน
                current.push(r);
                continue;
            }
            if (d >= startCurrent) {
                current.push(r);
            } else if (startPrev && d >= startPrev) {
                prev.push(r);
            }
        }

        return {
            rowsCurrent: current,
            rowsPrev: prev,
            totalInFilter: current.length,
        };
    }, [enrichedRows, dateRange]);

    const totalAll = enrichedRows.length;

    /* ---------- summary sentiment ปัจจุบัน / ก่อนหน้า ---------- */
    const sentimentCurrent = useMemo(
        () => makeSentimentSummary(rowsCurrent),
        [rowsCurrent]
    );
    const sentimentPrev = useMemo(
        () => makeSentimentSummary(rowsPrev),
        [rowsPrev]
    );

    /* ---------- คำนวณ risk level + เทรนด์ ---------- */
    const negRatio =
        sentimentCurrent.total > 0
            ? sentimentCurrent.neg / sentimentCurrent.total
            : 0;

    let riskLabel = "ต่ำ";
    let riskClass = "risk-low";
    if (negRatio >= 0.4 || sentimentCurrent.neg >= 30) {
        riskLabel = "สูง";
        riskClass = "risk-high";
    } else if (negRatio >= 0.25) {
        riskLabel = "ปานกลาง";
        riskClass = "risk-mid";
    }

    let negChangePct = null;
    if (sentimentPrev.total > 0 && sentimentPrev.neg > 0) {
        negChangePct = Math.round(
            ((sentimentCurrent.neg - sentimentPrev.neg) /
                Math.max(sentimentPrev.neg, 1)) *
            100
        );
    }

    let mentionsChangePct = null;
    if (rowsPrev.length > 0) {
        mentionsChangePct = Math.round(
            ((rowsCurrent.length - rowsPrev.length) /
                Math.max(rowsPrev.length, 1)) *
            100
        );
    }

    /* ---------- time series: pos/neu/neg ต่อวัน ---------- */
    const timeSeries = useMemo(() => {
        const map = new Map(); // date -> { date, pos, neu, neg, total }

        for (const r of rowsCurrent) {
            const dStr = r._dateStr || "ไม่ทราบวันที่";
            const cur =
                map.get(dStr) || {
                    date: dStr,
                    pos: 0,
                    neu: 0,
                    neg: 0,
                    total: 0,
                };

            if (r._sentKey === "pos") cur.pos += 1;
            else if (r._sentKey === "neg") cur.neg += 1;
            else cur.neu += 1;
            cur.total += 1;

            map.set(dStr, cur);
        }

        return Array.from(map.values()).sort((a, b) =>
            a.date.localeCompare(b.date)
        );
    }, [rowsCurrent]);

    /* ---------- faculty overview ---------- */
    const facultyOverview = useMemo(() => {
        const map = new Map(); // faculty -> { faculty, total, pos, neg, neu }

        for (const r of rowsCurrent) {
            const fac = r._faculty;
            const cur =
                map.get(fac) || {
                    faculty: fac,
                    total: 0,
                    pos: 0,
                    neu: 0,
                    neg: 0,
                };

            if (r._sentKey === "pos") cur.pos++;
            else if (r._sentKey === "neg") cur.neg++;
            else cur.neu++;

            cur.total++;
            map.set(fac, cur);
        }

        return Array.from(map.values())
            .map((f) => ({
                ...f,
                negPct: f.total ? Math.round((f.neg / f.total) * 100) : 0,
            }))
            .sort((a, b) => b.neg - a.neg || b.total - a.total);
    }, [rowsCurrent]);

    /* ---------- topics: top + emerging ---------- */
    const { topTopics, emergingTopics } = useMemo(() => {
        const curMap = new Map();
        const prevMap = new Map();

        rowsCurrent.forEach((r) => {
            r._topics.forEach((t) => {
                const key = t.trim();
                if (!key) return;
                curMap.set(key, (curMap.get(key) || 0) + 1);
            });
        });

        rowsPrev.forEach((r) => {
            r._topics.forEach((t) => {
                const key = t.trim();
                if (!key) return;
                prevMap.set(key, (prevMap.get(key) || 0) + 1);
            });
        });

        const allTopics = [];
        curMap.forEach((curCount, topic) => {
            const prevCount = prevMap.get(topic) || 0;
            allTopics.push({
                topic,
                cur: curCount,
                prev: prevCount,
                diff: curCount - prevCount,
            });
        });

        const topTopics = [...allTopics]
            .sort((a, b) => b.cur - a.cur)
            .slice(0, 10);

        const emergingTopics = allTopics
            .filter(
                (t) =>
                    t.cur >= 3 &&
                    (t.prev === 0 || t.cur >= t.prev * 2 || t.diff >= 3)
            )
            .sort((a, b) => b.diff - a.diff)
            .slice(0, 8);

        return { topTopics, emergingTopics };
    }, [rowsCurrent, rowsPrev]);

    /* ---------- channel / source insights ---------- */
    const channelStats = useMemo(() => {
        const map = new Map();

        rowsCurrent.forEach((r) => {
            const src = r._source;
            map.set(src, (map.get(src) || 0) + 1);
        });

        return Array.from(map.entries())
            .map(([source, count]) => ({ source, count }))
            .sort((a, b) => b.count - a.count);
    }, [rowsCurrent]);

    /* ---------- ตารางโพสต์ (drill-down) ---------- */
    const visiblePosts = useMemo(() => {
        const qq = q.trim().toLowerCase();
        const fac = facultyFilter;

        return rowsCurrent
            .filter((r) => {
                if (sentimentFilter !== "all" && r._sentKey !== sentimentFilter) {
                    return false;
                }

                if (fac !== "all" && r._faculty !== fac) {
                    return false;
                }

                return true;
            })
            .filter((r) => {
                if (!qq) return true;
                const text = `${r.text || ""} ${r._source || ""}`.toLowerCase();
                return text.includes(qq);
            })
            .sort((a, b) =>
                String(a._dateStr || "").localeCompare(String(b._dateStr || ""))
            )
            .reverse();
    }, [rowsCurrent, sentimentFilter, facultyFilter, q]);

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

                    <Link to="/trends2" className="nav-item">
                        <span>Keywords</span>
                    </Link>
                    <Link to="/model-eval" className="nav-item">
                        <span>Model Eval</span>
                    </Link>
                </nav>
            </aside>

            {/* Content */}
            <main className="main-content">
                <header className="page-header">
                    <div className="title-wrap">
                        <h1 className="page-title">Trends</h1>
                        <div className="page-sub">
                            โพสต์ทั้งหมด {totalAll} รายการ / อยู่ในช่วงเวลาที่เลือก{" "}
                            {totalInFilter} รายการ
                        </div>
                    </div>
                </header>

                <div className="content-wrap">
                    {/* ---------- Executive summary ---------- */}
                    <section className="card">
                        <div className="summary-row">
                            {/* total mentions */}
                            <div className="summary-card">
                                <div className="summary-label">
                                    Mentions ในช่วงนี้
                                </div>
                                <div className="summary-value">
                                    {rowsCurrent.length.toLocaleString()}
                                </div>
                                <div className="summary-sub">
                                    จากทั้งหมด {totalAll.toLocaleString()} โพสต์
                                </div>
                                {mentionsChangePct !== null && (
                                    <div
                                        className={
                                            "summary-trend " +
                                            (mentionsChangePct > 0
                                                ? "trend-up"
                                                : mentionsChangePct < 0
                                                    ? "trend-down"
                                                    : "")
                                        }
                                    >
                                        {mentionsChangePct > 0 ? "▲" : ""}
                                        {mentionsChangePct < 0 ? "▼" : ""}
                                        {mentionsChangePct === 0 ? "•" : ""}{" "}
                                        เทียบช่วงก่อนหน้า{" "}
                                        {Math.abs(mentionsChangePct)}%
                                    </div>
                                )}
                            </div>

                            {/* sentiment balance */}
                            <div className="summary-card">
                                <div className="summary-label">
                                    สัดส่วน sentiment
                                </div>
                                <div className="summary-sent-row">
                                    <span className="pill pos">
                                        + {sentimentCurrent.posPct}%
                                    </span>
                                    <span className="pill neu">
                                        0 {sentimentCurrent.neuPct}%
                                    </span>
                                    <span className="pill neg">
                                        - {sentimentCurrent.negPct}%
                                    </span>
                                </div>
                                <div className="summary-sub">
                                    บวก {sentimentCurrent.pos} / กลาง{" "}
                                    {sentimentCurrent.neu} / ลบ{" "}
                                    {sentimentCurrent.neg}
                                </div>
                                {negChangePct !== null && (
                                    <div
                                        className={
                                            "summary-trend " +
                                            (negChangePct > 0
                                                ? "trend-up"
                                                : negChangePct < 0
                                                    ? "trend-down"
                                                    : "")
                                        }
                                    >
                                        โพสต์ลบ{" "}
                                        {negChangePct > 0 ? "เพิ่ม" : "ลด"}{" "}
                                        {Math.abs(negChangePct)}% จากช่วงก่อนหน้า
                                    </div>
                                )}
                            </div>

                            {/* risk level */}
                            <div className="summary-card">
                                <div className="summary-label">
                                    ระดับความเสี่ยงภาพรวม
                                </div>
                                <div className={`summary-risk ${riskClass}`}>
                                    {riskLabel}
                                </div>
                                <div className="summary-sub">
                                    โพสต์ลบคิดเป็น{" "}
                                    {sentimentCurrent.negPct}% ของทั้งหมด
                                </div>
                                <div className="summary-sub tiny">
                                    เกณฑ์คร่าว ๆ: ต่ำ &lt; 25%, ปานกลาง ≈
                                    25–40%, สูง &gt; 40%
                                </div>
                            </div>

                            {/* top risky faculty / topic */}
                            <div className="summary-card">
                                <div className="summary-label">
                                    โฟกัสวันนี้
                                </div>
                                {facultyOverview.length > 0 ? (
                                    <>
                                        <div className="summary-focus-label">
                                            คณะที่มีโพสต์ลบมากสุด
                                        </div>
                                        <div className="summary-focus-main">
                                            {facultyOverview[0].faculty}
                                        </div>
                                        <div className="summary-sub">
                                            ลบ {facultyOverview[0].neg} โพสต์ (
                                            {facultyOverview[0].negPct}% ของ
                                            คณะนั้น)
                                        </div>
                                    </>
                                ) : (
                                    <div className="summary-sub">
                                        ยังไม่มีข้อมูลเพียงพอ
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* ---------- Filters + timeline + channel ---------- */}
                    <section className="card">
                        <div className="filters-row">
                            <div className="filter-group">
                                <div className="filter-label">ช่วงเวลา</div>
                                <select
                                    className="filter-select"
                                    value={dateRange}
                                    onChange={(e) =>
                                        setDateRange(e.target.value)
                                    }
                                >
                                    <option value="7d">7 วันที่ผ่านมา</option>
                                    <option value="30d">
                                        30 วันที่ผ่านมา
                                    </option>
                                    <option value="90d">
                                        90 วันที่ผ่านมา
                                    </option>
                                    <option value="all">ทั้งหมด</option>
                                </select>
                            </div>

                            <div className="filter-group">
                                <div className="filter-label">
                                    โทนความรู้สึก (ใช้กับตารางด้านล่าง)
                                </div>
                                <select
                                    className="filter-select"
                                    value={sentimentFilter}
                                    onChange={(e) =>
                                        setSentimentFilter(e.target.value)
                                    }
                                >
                                    <option value="all">ทั้งหมด</option>
                                    <option value="pos">Positive</option>
                                    <option value="neu">Neutral</option>
                                    <option value="neg">Negative</option>
                                </select>
                            </div>

                            <div className="filter-group">
                                <div className="filter-label">
                                    กรองตามคณะ (ใช้กับตาราง)
                                </div>
                                <select
                                    className="filter-select"
                                    value={facultyFilter}
                                    onChange={(e) =>
                                        setFacultyFilter(e.target.value)
                                    }
                                >
                                    <option value="all">ทุกคณะ</option>
                                    {facultyOverview.map((f) => (
                                        <option
                                            key={f.faculty}
                                            value={f.faculty}
                                        >
                                            {f.faculty}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="filter-group grow">
                                <div className="filter-label">
                                    ค้นหาในโพสต์ (ตารางด้านล่าง)
                                </div>
                                <input
                                    className="filter-search-input"
                                    placeholder="🔍 คำในโพสต์ / แหล่งที่มา"
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="two-cols">
                            {/* timeline */}
                            <div className="panel">
                                <div className="panel-title">
                                    แนวโน้มการพูดถึงตามเวลา
                                </div>
                                <div className="panel-sub">
                                    แสดงจำนวนโพสต์แยกตาม sentiment ในช่วงที่เลือก
                                </div>
                                <div className="trend-chart-wrap">
                                    {timeSeries.length === 0 ? (
                                        <div className="placeholder">
                                            ยังไม่มีข้อมูลในช่วงเวลานี้
                                        </div>
                                    ) : (
                                        <ResponsiveContainer
                                            width="100%"
                                            height={240}
                                        >
                                            <AreaChart data={timeSeries}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="date" />
                                                <YAxis />
                                                <Tooltip />
                                                <Area
                                                    type="monotone"
                                                    dataKey="pos"
                                                    name="Positive"
                                                    fillOpacity={0.35}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="neu"
                                                    name="Neutral"
                                                    fillOpacity={0.25}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="neg"
                                                    name="Negative"
                                                    fillOpacity={0.45}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>

                            {/* channel overview */}
                            <div className="panel">
                                <div className="panel-title">
                                    แหล่งที่มาของโพสต์ (Channel)
                                </div>
                                <div className="panel-sub">
                                    ดูว่าคนพูดถึง UTCC จากช่องทางไหนมากที่สุด
                                </div>
                                {channelStats.length === 0 ? (
                                    <div className="placeholder small">
                                        ยังไม่มีข้อมูลเพียงพอ
                                    </div>
                                ) : (
                                    <div className="channel-chart-wrap">
                                        <ResponsiveContainer
                                            width="100%"
                                            height={220}
                                        >
                                            <BarChart data={channelStats}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="source" />
                                                <YAxis allowDecimals={false} />
                                                <Tooltip />
                                                <Bar
                                                    dataKey="count"
                                                    name="จำนวนโพสต์"
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* ---------- Faculty overview ---------- */}
                    <section className="card">
                        <div className="card-head">
                            <h3 className="widget-title">
                                ภาพรวมตามคณะ / กลุ่ม
                            </h3>
                        </div>
                        {facultyOverview.length === 0 ? (
                            <div className="placeholder">
                                ยังไม่มีข้อมูลเพียงพอ
                            </div>
                        ) : (
                            <div className="faculty-table-wrap">
                                <table className="faculty-table">
                                    <thead>
                                    <tr>
                                        <th>Faculty / กลุ่ม</th>
                                        <th>โพสต์ทั้งหมด</th>
                                        <th>Positive</th>
                                        <th>Neutral</th>
                                        <th>Negative</th>
                                        <th>% Negative</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {facultyOverview.map((f) => (
                                        <tr key={f.faculty}>
                                            <td>{f.faculty}</td>
                                            <td>{f.total}</td>
                                            <td>{f.pos}</td>
                                            <td>{f.neu}</td>
                                            <td>{f.neg}</td>
                                            <td>
                                                    <span
                                                        className={
                                                            "neg-badge " +
                                                            (f.negPct >= 40
                                                                ? "high"
                                                                : f.negPct >= 25
                                                                    ? "mid"
                                                                    : "low")
                                                        }
                                                    >
                                                        {f.negPct}%
                                                    </span>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <p className="hint">
                            ตารางนี้อิงจากโพสต์ทุก sentiment
                            ในช่วงเวลาที่เลือกด้านบน
                            เลือกคณะจากเมนูกรอง เพื่อลงไปดูโพสต์จริงด้านล่าง
                        </p>
                    </section>

                    {/* ---------- Topics insight ---------- */}
                    <section className="card">
                        <div className="two-cols">
                            <div className="panel">
                                <div className="panel-title">
                                    ประเด็นที่พูดถึงมากที่สุด (Top Topics)
                                </div>
                                {topTopics.length === 0 ? (
                                    <div className="placeholder small">
                                        ยังไม่พบ topics ในช่วงนี้
                                    </div>
                                ) : (
                                    <div className="topic-list">
                                        {topTopics.map((t) => (
                                            <div
                                                key={t.topic}
                                                className="topic-item"
                                            >
                                                <span className="topic-text">
                                                    {t.topic}
                                                </span>
                                                <span className="topic-count">
                                                    {t.cur} โพสต์
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="panel">
                                <div className="panel-title">
                                    ประเด็นที่กำลังมา (Emerging)
                                </div>
                                <div className="panel-sub">
                                    ดูจากการเพิ่มขึ้นเมื่อเทียบกับช่วงก่อนหน้า
                                </div>
                                {emergingTopics.length === 0 ? (
                                    <div className="placeholder small">
                                        ยังไม่มีประเด็นที่เติบโตชัดเจน
                                    </div>
                                ) : (
                                    <div className="topic-list">
                                        {emergingTopics.map((t) => (
                                            <div
                                                key={t.topic}
                                                className="topic-item"
                                            >
                                                <span className="topic-text">
                                                    {t.topic}
                                                </span>
                                                <span className="topic-growth">
                                                    +{t.diff} โพสต์ (ตอนนี้{" "}
                                                    {t.cur} ครั้ง)
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* ---------- ล่าง: รายการโพสต์ (drill-down) ---------- */}
                    <section className="card">
                        <div className="card-head">
                            <h3 className="widget-title">
                                โพสต์ที่เข้าเกณฑ์ตัวกรอง
                            </h3>
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
                                    <div>Faculty</div>
                                    <div>Link</div>
                                </div>

                                {visiblePosts.map((r, idx) => {
                                    const title =
                                        r._topics.join(", ") ||
                                        (r.text
                                            ? r.text.slice(0, 120)
                                            : "โพสต์");
                                    const date = r._dateStr;
                                    const url = r._url;
                                    const faculty = r._faculty;

                                    return (
                                        <div
                                            className="t-row clickable"
                                            key={r.id ?? r.tweetId ?? idx}
                                            onClick={() => setSelectedPost(r)}
                                        >
                                            <div className="title-cell">
                                                {title}
                                            </div>
                                            <div>{date || "-"}</div>
                                            <div>{faculty}</div>
                                            <div>
                                                {url ? (
                                                    <a
                                                        className="link"
                                                        href={url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        onClick={(e) =>
                                                            e.stopPropagation()
                                                        }
                                                    >
                                                        เปิดลิงก์
                                                    </a>
                                                ) : (
                                                    "-"
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {!loading && visiblePosts.length === 0 && (
                                    <div className="empty-row">
                                        ไม่พบโพสต์ในตัวกรองนี้
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </div>

                {/* ---------- Modal: แสดงโพสต์เต็ม ---------- */}
                {selectedPost && (
                    <div
                        className="post-modal-backdrop"
                        onClick={() => setSelectedPost(null)}
                    >
                        <div
                            className="post-modal"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="post-modal-header">
                                <h3>รายละเอียดโพสต์</h3>
                                <button
                                    className="post-modal-close"
                                    onClick={() => setSelectedPost(null)}
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="post-modal-body">
                                <div className="post-meta-row">
                                    <span>
                                        วันที่:{" "}
                                        {selectedPost._dateStr || "-"}
                                    </span>
                                    <span>
                                        แหล่งที่มา:{" "}
                                        {selectedPost._source || "-"}
                                    </span>
                                    <span>
                                        คณะ / กลุ่ม:{" "}
                                        {selectedPost._faculty}
                                    </span>
                                    <span>
                                        Sentiment: {selectedPost._sentKey}
                                    </span>
                                </div>
                                <div className="post-text">
                                    {selectedPost.text || "(ไม่มีข้อความ)"}
                                </div>
                                <div className="post-link-row">
                                    {selectedPost._url ? (
                                        <a
                                            href={selectedPost._url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="primary-btn"
                                        >
                                            ไปยังโพสต์ต้นฉบับ
                                        </a>
                                    ) : (
                                        <span className="hint">
                                            ไม่มีลิงก์โพสต์ต้นฉบับในข้อมูลชุดนี้
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
