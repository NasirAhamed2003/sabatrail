import type { ReactNode } from "react";

// Inline message. Errors and warnings are announced immediately (role
// "alert"); success and info messages politely (role "status").
export default function Alert({
  tone = "info",
  children,
  className,
}: {
  tone?: "error" | "success" | "info" | "warning";
  children: ReactNode;
  className?: string;
}) {
  const urgent = tone === "error" || tone === "warning";

  return (
    <div className={["alert", `alert-${tone}`, className].filter(Boolean).join(" ")} role={urgent ? "alert" : "status"}>
      {children}
    </div>
  );
}
