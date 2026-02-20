# Story 6.2 — Add Global Error Boundary

## User Story

**As a** user who encounters a page error,
**I want** to see a helpful branded error page with recovery options,
**so that** I can get back to work without manually refreshing or clearing the URL.

**Priority:** High
**Points:** 3
**Epic:** 6 — Navigation & Error Recovery

---

## Acceptance Criteria

- [ ] **AC 6.2.1** — An `error.tsx` file exists at `app/(authenticated)/error.tsx`
- [ ] **AC 6.2.2** — Error page shows: EDUPO crown logo, "Something went wrong" heading, a friendly descriptive message, "Try Again" button (calls `reset()`), "Go to Dashboard" link
- [ ] **AC 6.2.3** — Error page uses the same light background (`#f5f7fa`) as the rest of the app
- [ ] **AC 6.2.4** — Runtime errors in any authenticated page render this error page instead of the Next.js default
- [ ] **AC 6.2.5** — A `global-error.tsx` also exists at `app/global-error.tsx` as the root-level catch-all

---

## Technical Notes

### Authenticated Error Boundary

**New file:** `frontend/src/app/(authenticated)/error.tsx`

```tsx
"use client";

import { Button, Typography, Space } from "antd";
import { CrownOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function AuthenticatedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{
      minHeight: "60vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      padding: 24,
    }}>
      <CrownOutlined style={{ fontSize: 48, color: "#D4AF37" }} />
      <Title level={3} style={{ margin: 0 }}>Something went wrong</Title>
      <Text type="secondary">
        An unexpected error occurred. You can try again or go back to the dashboard.
      </Text>
      <Space size="middle" style={{ marginTop: 16 }}>
        <Button type="primary" onClick={reset}>Try Again</Button>
        <Button href="/dashboard">Go to Dashboard</Button>
      </Space>
    </div>
  );
}
```

### Root-Level Error Boundary

**New file:** `frontend/src/app/global-error.tsx`

```tsx
"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, sans-serif",
        background: "#f5f7fa",
        gap: 16,
      }}>
        <h2>Something went wrong</h2>
        <p>An unexpected error occurred.</p>
        <button onClick={reset} style={{ padding: "8px 24px", cursor: "pointer" }}>
          Try Again
        </button>
      </body>
    </html>
  );
}
```

- Next.js App Router `error.tsx` must be a Client Component (`"use client"`)
- Receives `error` and `reset` props
- Keep it simple — no complex state, no API calls, no auth checks (it must render even when everything else is broken)
- The `global-error.tsx` must render its own `<html>` and `<body>` tags (Next.js requirement)

---

## Dev Checklist

- [ ] Create `app/(authenticated)/error.tsx`
- [ ] Create `app/global-error.tsx`
- [ ] Test by temporarily throwing an error in a page component
- [ ] Verify "Try Again" button recovers the page
- [ ] Verify "Go to Dashboard" navigates correctly
- [ ] Verify styled consistently with app theme
