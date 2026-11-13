"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="en"><body><main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#09090b", color: "#f6f6f7", fontFamily: "Arial, sans-serif" }}><section style={{ maxWidth: 420 }}><p style={{ color: "#c9ff3d", fontSize: 12, letterSpacing: ".08em" }}>Qram</p><h1>Something did not load.</h1><p style={{ color: "#a3a3ae", lineHeight: 1.5 }}>Your data has not been changed. Try loading this view again.</p><button onClick={reset} style={{ padding: "10px 13px", border: 0, borderRadius: 6, background: "#c9ff3d", color: "#111", cursor: "pointer" }}>Try again</button></section></main></body></html>;
}
