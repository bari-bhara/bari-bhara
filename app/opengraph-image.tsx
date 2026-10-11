import { ImageResponse } from "next/og";

// Link-preview image (social networks, chat apps). Colours mirror the dark
// tokens in globals.css (ADR 0008); CSS variables aren't available here.
export const alt = "Bari Bhara: rental and property management";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const MOSS = "#141712";
const INK = "#EBEFE3";
const MUTED = "#9EA595";
const LIME = "#D0EA86";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: MOSS,
          color: INK,
          padding: 80,
          flexDirection: "column",
          justifyContent: "space-between",
          overflow: "hidden",
        }}
      >
        {/* Orbit rings, right-hand side */}
        {[620, 480, 340].map((d) => (
          <div
            key={d}
            style={{
              position: "absolute",
              right: 260 - d / 2,
              top: 315 - d / 2,
              width: d,
              height: d,
              borderRadius: d,
              border: "1.5px solid rgba(235,239,227,0.12)",
            }}
          />
        ))}
        <div
          style={{ position: "absolute", right: 152, top: 108, width: 18, height: 18, borderRadius: 18, background: LIME }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 32 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 40,
              border: `3px solid ${INK}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: 14, height: 14, borderRadius: 14, background: LIME }} />
          </div>
          Bari Bhara
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 760 }}>
          <div style={{ fontSize: 76, lineHeight: 1.05, letterSpacing: -2 }}>Every flat, every payment, in order.</div>
          <div style={{ fontSize: 30, color: MUTED }}>Rent, bills, maintenance and notices for landlords and tenants.</div>
        </div>
      </div>
    ),
    size,
  );
}
