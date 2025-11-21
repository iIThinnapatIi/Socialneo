// src/pages/Settings.jsx  (ปรับ path ตามโปรเจกต์คุณ)
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./Homepage.css";
import { getSettings, updateSettings } from "./services/api";
import { postScanAlerts, postTestMail } from "./services/api";
import { applyTheme } from "./theme/applyTheme";

export default function SettingsPage() {
    // ---------- state ----------
    const [loading, setLoading] = useState(true);
    const [saving, setSaving]   = useState(false);
    const [err, setErr]         = useState("");
    const [ok, setOk]           = useState("");

    const [theme, setTheme] = useState("LIGHT");
    const [notificationsEnabled, setNotify] = useState(true);
    const [negativeThreshold, setNeg] = useState(20);
    const [sources, setSources] = useState([]);
    const [analysisScope, setScope] = useState("ทั้งหมด");
    const [updatedAt, setUpdatedAt] = useState("");

    const allSources = useMemo(
        () => ["news", "forums", "youtube", "tiktok", "blogs"],
        []
    );

    // ---------- load settings ----------
    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true); setErr(""); setOk("");
            try {
                const s = await getSettings();
                if (!alive) return;
                setTheme((s?.theme || "LIGHT").toUpperCase() === "DARK" ? "DARK" : "LIGHT");
                setNotify(!!s?.notificationsEnabled);
                setNeg(Number(s?.negativeThreshold ?? 20));
                setSources(Array.isArray(s?.sources) ? s.sources : []);
                setScope(s?.analysisScope || "ทั้งหมด");
                setUpdatedAt(s?.updatedAt || "");
            } catch (e) {
                setErr("โหลดการตั้งค่าไม่สำเร็จ: " + String(e?.message || e));
            } finally {
                setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, []);

    // ---------- handlers ----------
    const toggleSource = (name) => {
        setSources((old) => old.includes(name) ? old.filter(x => x !== name) : [...old, name]);
    };

    const onReset = async () => {
           setErr(""); setOk("");
           setLoading(true);
           try {
                 const s = await getSettings();
                 setTheme((s?.theme||"LIGHT").toUpperCase()==="DARK"?"DARK":"LIGHT");
                 setNotify(!!s?.notificationsEnabled);
                 setNeg(Number(s?.negativeThreshold ?? 20));
                 setSources(Array.isArray(s?.sources) ? s.sources : []);
                 setScope(s?.analysisScope || "ทั้งหมด");
                 setUpdatedAt(s?.updatedAt || "");
                 applyTheme(s?.theme);
               } catch (e) {
                 setErr("โหลดค่าจากฐานไม่สำเร็จ: " + String(e?.message||e));
               } finally { setLoading(false); }
         };

    const onSave = async () => {
        setSaving(true); setErr(""); setOk("");
        try {
            await postScanAlerts(); // สแกน negative & แจ้งเตือนถ้าเกิน threshold
            await postTestMail();   // ส่งอีเมลทดสอบ (backend log จะแสดง)
            await updateSettings({
                theme,
                notificationsEnabled,
                negativeThreshold: Number(negativeThreshold || 0),
                sources,
                analysisScope,
            });
            applyTheme(theme);
            setOk("บันทึกสำเร็จ ✅");
            const s2 = await getSettings(); // อ่านกลับเพื่ออัปเดตเวลา
            setUpdatedAt(s2?.updatedAt || "");
        } catch (e) {
            setErr("บันทึกไม่สำเร็จ: " + String(e?.message || e));
        } finally {
            setSaving(false);
        }
    };

    // ---------- UI ----------
    return (
        <div className="homepage-container">{/* ใช้โครงเดียวกับหน้าอื่น */}
            {/* Sidebar */}
            <div className="sidebar">
                <div className="logo-container">
                    <img
                        src="https://upload.wikimedia.org/wikipedia/th/f/f5/%E0%B8%95%E0%B8%A3%E0%B8%B2%E0%B8%A1%E0%B8%AB%E0%B8%B2%E0%B8%A7%E0%B8%B4%E0%B8%97%E0%B8%A2%E0%B8%B2%E0%B8%A5%E0%B8%B1%E0%B8%A2%E0%B8%AB%E0%B8%AD%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B8%84%E0%B9%89%E0%B8%B2%E0%B9%84%E0%B8%97%E0%B8%A2.svg"
                        width="100%" alt="UTCC"
                    />
                    <span className="logo-utcc"> UTCC </span>
                    <span className="logo-social"> Social</span>
                </div>

                <nav className="nav-menu">
                    <Link to="/dashboard" className="nav-item">
                        <i className="far fa-chart-line"></i><span>Dashboard</span>
                    </Link>
                    <Link to="/mentions" className="nav-item">
                        <i className="fas fa-comment-dots"></i><span>Mentions</span>
                    </Link>
                    <Link to="/trends" className="nav-item">
                        <i className="fas fa-stream"></i><span>Trends</span>
                    </Link>
                    <Link to="/settings" className="nav-item active">
                        <i className="fas fa-cog"></i><span>Settings</span>
                    </Link>
                    <Link to="/trends2" className="nav-item">
                        <span>Keywords</span>
                    </Link>
                </nav>
            </div>

            {/* Main */}
            <div className="main-content">
                <header className="main-header">
                    <div className="header-left">
                        <h1 className="header-title">Settings</h1>
                        {updatedAt && (
                                 <div style={{color:"var(--muted)", fontSize:14, marginTop:4}}>
                                       อัปเดตล่าสุด: {String(updatedAt).replace("T"," ").slice(0,19)}
                                     </div>
                            )}
                    </div>
                    <div className="header-right" style={{ gap: 8 }}>
                        <button onClick={onReset} className="btn btn-ghost">Reset</button>
                        <button onClick={onSave} className="btn btn-primary" disabled={saving || loading}>
                            {saving ? "Saving..." : "Save Settings"}
                        </button>
                    </div>
                </header>

                {err && (
                    <div className="widget-card" style={{ border: "1px solid #f44336", color: "#c62828" }}>
                        {err}
                    </div>
                )}
                {ok && (
                    <div className="widget-card" style={{ border: "1px solid #2e7d32", color: "#2e7d32" }}>
                        {ok}
                    </div>
                )}

                <main className="widgets-grid">{/* ใช้กริดเดียวกับหน้าอื่น */}
                    {/* Theme */}
                    <div className="widget-card">
                        <h3 className="widget-title">Theme</h3>
                        <div className="form-row">
                            <label className="radio">
                                <input type="radio" name="theme" checked={theme === "LIGHT"} onChange={() => setTheme("LIGHT")} />
                                โทนสว่าง (ฟ้า/เทาอ่อน)
                            </label>
                        </div>
                        <div className="form-row">
                            <label className="radio">
                                <input type="radio" name="theme" checked={theme === "DARK"} onChange={() => setTheme("DARK")} />
                                โทนเข้ม (Dark/Night)
                            </label>
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className="widget-card">
                        <h3 className="widget-title">Notifications</h3>
                        <label className="form-row">
                            <input
                                type="checkbox"
                                checked={notificationsEnabled}
                                onChange={(e) => setNotify(e.target.checked)}
                            />
                            <span style={{ marginLeft: 8 }}>ส่งอีเมลแจ้งเตือน</span>
                        </label>
                        <div className="form-row" style={{ alignItems: "center" }}>
                            <div>แจ้งเตือนเมื่อสัดส่วน Negative มากกว่า (%)</div>
                            <input
                                type="number"
                                min={0} max={100}
                                value={negativeThreshold}
                                onChange={(e) => setNeg(e.target.value)}
                                className="input"
                                style={{ width: 120, marginLeft: 10 }}
                            />
                        </div>
                    </div>

                    {/* Data Sources */}
                    <div className="widget-card">
                        <h3 className="widget-title">Data Sources (Public)</h3>
                        <div className="form-grid">
                            {allSources.map((s) => (
                                <label key={s} className="checkbox">
                                    <input
                                        type="checkbox"
                                        checked={sources.includes(s)}
                                        onChange={() => toggleSource(s)}
                                    />
                                    <span style={{ marginLeft: 6 }}>{s}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Analysis Scope */}
                    <div className="widget-card">
                        <h3 className="widget-title">ขอบเขตการวิเคราะห์</h3>
                        <select
                            value={analysisScope}
                            onChange={(e) => setScope(e.target.value)}
                            className="select"
                            style={{ width: 180 }}
                        >
                            <option value="ทั้งหมด">ทั้งหมด</option>
                            <option value="เฉพาะคณะ">เฉพาะคณะ</option>
                        </select>
                        <div style={{ color: "#666", marginTop: 8 }}>
                            ใช้กำหนดการแสดงผล/รายงานเริ่มต้นในหน้าต่าง ๆ
                        </div>
                    </div>
                </main>

                {loading && <div style={{ color: "#666" }}>กำลังโหลด…</div>}
            </div>
        </div>
    );
}
