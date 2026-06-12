"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const LoginFormContent = dynamic(() => import("./LoginFormContent"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
    >
      Loading...
    </div>
  ),
});

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ height: "100vh" }} />}>
      <LoginFormContent />
    </Suspense>
  );
}
