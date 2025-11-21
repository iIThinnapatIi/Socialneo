// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";

import Homepage from "./Homepage";
import Dashboard from "./Dashboard";
import Trends from "./Trends";
import Settings from "./Settings";
import Pageone from "./Pageone";
import Keyword from "./Keywords"; // ไม่จำเป็นต้องใส่ .jsx ก็ได้

// ห่อ route ที่ต้องล็อกอินก่อนถึงเข้าได้
function RequireAuth({ isLoggedIn, children }) {
    return isLoggedIn ? children : <Navigate to="/login" replace />;
}

export default function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    return (
        <Router>
            <Routes>
                {/* เริ่มที่ /login เสมอ */}
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* หน้า Login */}
                <Route
                    path="/login"
                    element={<Pageone onLogin={() => setIsLoggedIn(true)} />}
                />

                {/* Mentions */}
                <Route
                    path="/mentions"
                    element={
                        <RequireAuth isLoggedIn={isLoggedIn}>
                            <Homepage />
                        </RequireAuth>
                    }
                />

                {/* Dashboard */}
                <Route
                    path="/dashboard"
                    element={
                        <RequireAuth isLoggedIn={isLoggedIn}>
                            <Dashboard />
                        </RequireAuth>
                    }
                />

                {/* Trends */}
                <Route
                    path="/trends"
                    element={
                        <RequireAuth isLoggedIn={isLoggedIn}>
                            <Trends />
                        </RequireAuth>
                    }
                />

                {/* Settings */}
                <Route
                    path="/settings"
                    element={
                        <RequireAuth isLoggedIn={isLoggedIn}>
                            <Settings />
                        </RequireAuth>
                    }
                />

                {/* ✅ Keywords (trends2) – ต้องล็อกอินเหมือนกัน */}
                <Route
                    path="/trends2"
                    element={
                        <RequireAuth isLoggedIn={isLoggedIn}>
                            <Keyword />
                        </RequireAuth>
                    }
                />

                {/* กัน path แปลก ๆ → ส่งกลับไป login */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </Router>
    );
}
