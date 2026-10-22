import { useEffect, useState } from "react";
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

const LOGO = urls["../assets/logo.svg"];
const MARK = urls["../assets/logo-mark.svg"];

// A wide logo is a lockup that already includes the wordmark, so the
// "SabaTrail" text is not repeated beside it; a square-ish logo is a mark
// only. The shape is measured once in the browser (the file isn't bundled
// into the JavaScript), and the text shows until the answer is known.
let logoIsLockup: boolean | null = null;
const logoMeasured = LOGO
  ? new Promise<boolean>((resolve) => {
      const probe = new Image();
      probe.onload = () => resolve(probe.naturalWidth / probe.naturalHeight >= 1.6);
      probe.onerror = () => resolve(false);
      probe.src = LOGO;
    }).then((lockup) => (logoIsLockup = lockup))
  : null;

function useLogoIsLockup() {
  const [lockup, setLockup] = useState(logoIsLockup);

  useEffect(() => {
    let active = true;
    void logoMeasured?.then((value) => {
      if (active) setLockup(value);
    });
    return () => {
      active = false;
    };
  }, []);

  return lockup === true;
}

export default function Logo({ placement = "header" }: { placement?: "header" | "footer" }) {
  const hasWordmark = useLogoIsLockup();

  return (
    <Link className={`brand brand-${placement}`} to="/">
      {LOGO ? (
        <>
          <picture>
            {MARK && <source media="(max-width: 639px)" srcSet={MARK} />}
            <img
              className={MARK ? "brand-logo has-mark" : "brand-logo"}
              src={LOGO}
              alt={hasWordmark ? "SabaTrail" : ""}
            />
          </picture>
          {!hasWordmark && <span>SabaTrail</span>}
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
