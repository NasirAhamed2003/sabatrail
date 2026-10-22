import { Link } from "react-router";
import "./Logo.css";

// Site logo, used in the header and footer.
//
// Drop the logo files into these locations and they are picked up
// automatically (import.meta.glob only matches files that exist, so the app
// builds and looks the same without them):
//   src/assets/logo.svg       primary logo: the full lockup (mark + "SabaTrail"),
//                             or a mark on its own
//   src/assets/logo-mark.svg  optional square mark, shown on narrow screens
//   public/favicon.svg (+ favicon.png 32x32) for the browser tab
const urls = import.meta.glob<string>("../assets/logo*.svg", { eager: true, query: "?url", import: "default" });
const sources = import.meta.glob<string>("../assets/logo.svg", { eager: true, query: "?raw", import: "default" });

const LOGO = urls["../assets/logo.svg"];
const MARK = urls["../assets/logo-mark.svg"];

// Width / height of an SVG, from its viewBox or width and height attributes
function aspectRatio(svg: string | undefined) {
  if (!svg) return null;

  const viewBox = /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(svg);
  const width = /<svg[^>]*\swidth\s*=\s*["']([\d.]+)/i.exec(svg);
  const height = /<svg[^>]*\sheight\s*=\s*["']([\d.]+)/i.exec(svg);

  const [w, h] = viewBox ? [viewBox[1], viewBox[2]] : [width?.[1], height?.[1]];
  return w && h ? Number(w) / Number(h) : null;
}

// A wide logo is a lockup that already includes the wordmark, so the
// "SabaTrail" text is not repeated beside it. A square-ish logo is a mark only.
const LOGO_HAS_WORDMARK = (aspectRatio(sources["../assets/logo.svg"]) ?? 0) >= 1.6;

export default function Logo({ placement = "header" }: { placement?: "header" | "footer" }) {
  return (
    <Link className={`brand brand-${placement}`} to="/">
      {LOGO ? (
        <>
          <picture>
            {MARK && <source media="(max-width: 639px)" srcSet={MARK} />}
            <img
              className={MARK ? "brand-logo has-mark" : "brand-logo"}
              src={LOGO}
              alt={LOGO_HAS_WORDMARK ? "SabaTrail" : ""}
            />
          </picture>
          {!LOGO_HAS_WORDMARK && <span>SabaTrail</span>}
        </>
      ) : (
        // PLACEHOLDER until src/assets/logo.svg is added: the "S" mark and wordmark
        <>
          <span className="brand-icon" aria-hidden="true">
            S
          </span>
          <span>SabaTrail</span>
        </>
      )}
    </Link>
  );
}
