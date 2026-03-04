# Story 5.4 — Add File Upload Validation to Expense Attachments

## User Story

**As a** user uploading expense attachments,
**I want** the app to reject invalid files immediately,
**so that** I don't waste time uploading a file that the server will reject.

**Priority:** High
**Points:** 2
**Epic:** 5 — Speed & Functionality Quick Fixes

---

## Acceptance Criteria

- [ ] **AC 5.4.1** — Upload component only accepts PDF and image files: `accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"`
- [ ] **AC 5.4.2** — Files larger than 3MB are rejected in `beforeUpload` with `message.error("File must be smaller than 3MB")`
- [ ] **AC 5.4.3** — Files with invalid types are rejected with `message.error("Only PDF and image files are allowed")`
- [ ] **AC 5.4.4** — Rejected files are NOT added to the `fileList`
- [ ] **AC 5.4.5** — Help text accurately reflects the enforced limits (already says "Max 3MB" — verify it is correct)

---

## Technical Notes

**File:** `frontend/src/components/expenses/AddExpenseModal.tsx`

In the `beforeUpload` handler, add validation before the existing logic:

```tsx
const isValidType = /\.(pdf|png|jpe?g|gif|webp)$/i.test(file.name);
const isUnder3MB = file.size / 1024 / 1024 < 3;

if (!isValidType) {
  message.error("Only PDF and image files are allowed");
  return Upload.LIST_IGNORE;
}
if (!isUnder3MB) {
  message.error("File must be smaller than 3MB");
  return Upload.LIST_IGNORE;
}
```

Add `accept` prop to the `<Upload>` component for OS-level file picker filtering:

```tsx
<Upload
  accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
  fileList={fileList}
  beforeUpload={...}
  ...
>
```

---

## Dev Checklist

- [ ] Add `accept` prop to Upload component
- [ ] Add file type validation in `beforeUpload`
- [ ] Add file size validation in `beforeUpload`
- [ ] Return `Upload.LIST_IGNORE` for rejected files
- [ ] Verify help text matches enforced limits
- [ ] Test with: valid PDF, valid image, oversized file, .exe file, .zip file
