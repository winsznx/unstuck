import { ImageResponse } from "next/og";
import { MARK, token } from "@/lib/og/card";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The icon.svg tag on the canvas. iOS fills transparency with black, so the mark sits on an opaque square. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", background: token("canvas") }}>
        <img alt="" width={124} height={124} src={MARK} />
      </div>
    ),
    size,
  );
}
