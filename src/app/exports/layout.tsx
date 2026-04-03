import type { ReactNode } from "react";

export default function ExportsLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9" }}>
      {children}
    </div>
  );
}
