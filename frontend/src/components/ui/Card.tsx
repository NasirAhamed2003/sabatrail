import type { ReactNode } from "react";

// Surface panel: white background, hairline border, soft shadow (section 4.2)
export default function Card({
  as: Tag = "div",
  pad = true,
  className,
  children,
  ...rest
}: {
  as?: "div" | "section" | "article" | "aside";
  pad?: boolean;
  className?: string;
  children: ReactNode;
  "aria-labelledby"?: string;
}) {
  return (
    <Tag className={["card", pad && "card-pad", className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </Tag>
  );
}
