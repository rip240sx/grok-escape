import React, { useState, useEffect } from "react";
import Game from "./components/Game";

export default function App() {
  const [started, setStarted] = useState(false);
  const [landscape, setLandscape] = useState(window.innerWidth > window.innerHeight);

  useEffect(() => {
    const onResize = () => setLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  const handleStart = () => {
    setStarted(true);
    setTimeout(() => window.dispatchEvent(new Event("resize")), 300);
  };

  return (
    <div style={{ height: "100vh", background: "#0b1114", overflow: "hidden" }}>
      {!started && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.6)",
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              padding: "32px",
              borderRadius: "16px",
              textAlign: "center",
              color: "white",
              maxWidth: "90%",
            }}
          >
            <h1 style={{ margin: "0 0 16px", fontSize: "28px" }}>Grok Runner</h1>
            <p style={{ margin: "0 0 20px", opacity: 0.8 }}>Play on your phone in landscape</p>
            <button
              onClick={handleStart}
              style={{
                fontSize: "18px",
                padding: "12px 24px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(90deg,#1fa2ff,#12d8fa)",
                color: "#032",
                fontWeight: "700",
                cursor: "pointer",
                width: "100%",
              }}
            >
              Start
            </button>
            <small style={{ display: "block", marginTop: "12px", opacity: 0.7, fontSize: "13px" }}>
              Use joystick (left) and Jump (right)
            </small>
          </div>
        </div>
      )}

      {started && <Game />}

      {!landscape && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.9)",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            fontSize: "20px",
            textAlign: "center",
            padding: "20px",
          }}
        >
          Please rotate your device to landscape
        </div>
      )}
    </div>
  );
}
