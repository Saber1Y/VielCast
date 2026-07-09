import { ReactNode } from "react";

export function GlassCard({
  children,
  className = "",
  hover = true,
  id,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={`glass-card ${hover ? "glass-hover" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
