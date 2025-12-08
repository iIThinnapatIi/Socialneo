// src/Pageone.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Pageone.css";
import axios from "axios";

// ✅ ดึง API_BASE จาก services/api ที่หน้าอื่นใช้
import { API_BASE } from "./services/api";

// ✅ ใช้ backend จริงบน Render (ผ่าน API_BASE)
const LOGIN_URL = `${API_BASE}/login`;

function Pageone({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // ✅ backend ฝั่ง Spring น่าจะรับ @RequestParam
      //    เลยส่ง username/password เป็น query params
      const res = await axios.post(
          LOGIN_URL,
          null, // ไม่มี body
          {
            params: { username, password },
            // ถ้า login ใช้ session / cookie ค่อยเปิดบรรทัดนี้
            // withCredentials: true,
          }
      );

      console.log("Login Response:", res.data);

      // รองรับทั้งแบบส่ง String ตรง ๆ และ JSON
      const data =
          typeof res.data === "string" ? res.data.trim() : res.data;

      const isSuccess =
          data === "Login Success" ||
          (data && typeof data === "object" && data.status === "ok");

      if (isSuccess) {
        if (typeof onLogin === "function") {
          onLogin();
        }
        navigate("/mentions");
      } else {
        setError(
            (data && typeof data === "object" && data.message) ||
            data ||
            "Invalid username or password"
        );
      }
    } catch (err) {
      console.error("Login error:", err);

      if (err.response) {
        setError(
            `Server error (${err.response.status})`
        );
      } else {
        setError("Network error");
      }
    }
  };

  return (
      <>
        {/* วงกลม 4 มุม */}
        <div className="corner top-left"></div>
        <div className="corner top-right"></div>
        <div className="corner bottom-left"></div>
        <div className="corner bottom-right"></div>

        <div className="login-container">
          <div className="login-box">
            <div className="logo-container">
              <img
                  src="https://upload.wikimedia.org/wikipedia/th/f/f5/%E0%B8%95%E0%B8%A3%E0%B8%B2%E0%B8%A1%E0%B8%AB%E0%B8%B2%E0%B8%A7%E0%B8%B4%E0%B8%97%E0%B8%A2%E0%B8%B2%E0%B8%A5%E0%B8%B1%E0%B8%A2%E0%B8%AB%E0%B8%AD%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B8%84%E0%B9%89%E0%B8%B2%E0%B9%84%E0%B8%97%E0%B8%A2.svg"
                  alt="logo"
              />
              <span className="utcc-text">UTCC</span>
              <span className="social-text">Social</span>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username / Email"
                    className="form-control"
                />
              </div>

              <div className="form-group">
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="form-control"
                />
              </div>

              <button type="submit" className="login-btn">
                Login
              </button>

              {error && <p className="error-text">{error}</p>}
            </form>
          </div>
        </div>
      </>
  );
}

export default Pageone;
