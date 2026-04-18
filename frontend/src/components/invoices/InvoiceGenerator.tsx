"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button, Layout, Flex, Space, Typography, message, Spin, Popconfirm } from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  EyeOutlined,
  PrinterOutlined,
  RedoOutlined,
  SaveOutlined,
  SendOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { useInvoice, useInvalidateQueries, apiFetch } from "@/hooks/useApi";
import { sanitizeHtml } from "@/lib/sanitize";
import { usePermissions } from "@/hooks/usePermissions";
import { getInvoiceDisplayNumber, type Invoice } from "@/types/invoice";
import { InvoicePrintView } from "./InvoicePrintView";
import { InvoiceForm } from "./InvoiceForm";

const { Sider, Content } = Layout;
const { Title } = Typography;

interface InvoiceGeneratorProps {
  invoiceId: string;
}

export const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({ invoiceId }) => {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const { data: serverInvoice, isLoading } = useInvoice(invoiceId);
  const { invalidateInvoices, invalidateInvoice, invalidateWaybills } = useInvalidateQueries();

  const [localInvoice, setLocalInvoice] = useState<Invoice | null>(null);
  const [editMode, setEditMode] = useState(true);
  const [saving, setSaving] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [reissuing, setReissuing] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Sync server data to local state
  useEffect(() => {
    if (serverInvoice && !localInvoice) {
      setLocalInvoice(serverInvoice);
      // Auto-open edit panel for drafts
      setEditMode(serverInvoice.status === "draft");
    }
  }, [serverInvoice, localInvoice]);

  const handleChange = useCallback((updates: Partial<Invoice>) => {
    setLocalInvoice((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (typeof error === "object" && error !== null && "detail" in error && typeof error.detail === "string") {
      return error.detail;
    }
    return fallback;
  };

  const handleSave = async () => {
    if (!localInvoice) return;
    setSaving(true);
    try {
      const body = {
        invoice_number: localInvoice.invoice_number,
        date: localInvoice.date,
        due_date: localInvoice.due_date,
        customer_name: localInvoice.customer_name,
        customer_tin: localInvoice.customer_tin,
        regarding: localInvoice.regarding,
        currency: localInvoice.currency,
        vat_rate: localInvoice.vat_rate,
        exchange_rate: localInvoice.exchange_rate,
        items: localInvoice.items,
      };
      const updated = await apiFetch<Invoice>(`/api/v1/invoices/${invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setLocalInvoice(updated);
      invalidateInvoice(invoiceId);
      message.success("Invoice saved");
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to save invoice"));
    } finally {
      setSaving(false);
    }
  };

  const handleIssue = async () => {
    if (!localInvoice) return;
    setIssuing(true);
    try {
      // Save first, then issue
      await handleSave();
      const updated = await apiFetch<Invoice>(`/api/v1/invoices/${invoiceId}/issue`, {
        method: "POST",
      });
      setLocalInvoice(updated);
      invalidateInvoice(invoiceId);
      invalidateInvoices();
      invalidateWaybills();
      message.success("Invoice issued — rate written back to waybill");
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to issue invoice"));
    } finally {
      setIssuing(false);
    }
  };

  const handleVoid = async () => {
    try {
      const updated = await apiFetch<Invoice>(`/api/v1/invoices/${invoiceId}/void`, {
        method: "POST",
      });
      setLocalInvoice(updated);
      invalidateInvoice(invoiceId);
      invalidateInvoices();
      invalidateWaybills();
      message.success("Invoice voided");
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to void invoice"));
    }
  };

  const handleReissue = async () => {
    setReissuing(true);
    try {
      const newInvoice = await apiFetch<Invoice>(`/api/v1/invoices/${invoiceId}/reissue`, {
        method: "POST",
      });
      invalidateInvoice(invoiceId);
      invalidateInvoices();
      invalidateWaybills();
      message.success(`Invoice voided. New draft ${getInvoiceDisplayNumber(newInvoice)} created.`);
      router.push(`/ops/invoices/${newInvoice.id}`);
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to reissue invoice"));
    } finally {
      setReissuing(false);
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;

    // Render the invoice into a hidden iframe and print from it.
    // No new tab opens — the print dialog appears directly on the
    // current page. Once the print dialog closes, the iframe is removed.
    const printContent = sanitizeHtml(printRef.current.innerHTML);

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.bottom = "0";
    iframe.style.right = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
  <title>Invoice ${localInvoice ? getInvoiceDisplayNumber(localInvoice) : ""}</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Fira+Code:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', 'Segoe UI', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style>
</head>
<body>${printContent}</body>
</html>`);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 600);
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!localInvoice) {
    return (
      <div style={{ padding: "var(--space-xl)", textAlign: "center" }}>
        <Title level={4}>Invoice not found</Title>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const isDraft = localInvoice.status === "draft";
  const canVoid = hasPermission("invoices:void") && localInvoice.status !== "voided";
  const canReissue = hasPermission("invoices:reissue") &&
    (localInvoice.status === "issued" || localInvoice.status === "partially_paid" || localInvoice.status === "voided");

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      {/* Toolbar */}
      <div
        style={{
          padding: "12px 24px",
          background: "var(--color-bg-container)",
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Flex gap="small" align="center">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
            Back
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            {getInvoiceDisplayNumber(localInvoice)}
          </Title>
          <span
            style={{
              padding: "2px 10px",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              color: "#fff",
              background:
                localInvoice.status === "draft" ? "#8c8c8c"
                : localInvoice.status === "issued" ? "#1677ff"
                : localInvoice.status === "partially_paid" ? "#fa8c16"
                : localInvoice.status === "fully_paid" ? "#52c41a"
                : "#ff4d4f",
            }}
          >
            {localInvoice.status === "partially_paid" ? "Partial" :
             localInvoice.status === "fully_paid" ? "Paid" :
             localInvoice.status.charAt(0).toUpperCase() + localInvoice.status.slice(1)}
          </span>
        </Flex>
        <Space>
          <Button
            icon={editMode ? <EyeOutlined /> : <EditOutlined />}
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? "Preview" : "Edit"}
          </Button>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>
            Print / PDF
          </Button>
          {isDraft && (
            <>
              <Button
                icon={<SaveOutlined />}
                loading={saving}
                onClick={handleSave}
              >
                Save
              </Button>
              <Popconfirm
                title="Issue this invoice?"
                description="This will set the rate on the waybill and mark it as Invoiced. This cannot be undone."
                onConfirm={handleIssue}
                okText="Issue"
              >
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={issuing}
                >
                  Issue
                </Button>
              </Popconfirm>
            </>
          )}
          {canVoid && (
            <Popconfirm
              title="Void this invoice?"
              description="This action cannot be undone."
              onConfirm={handleVoid}
              okText="Void"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<StopOutlined />}>
                Void
              </Button>
            </Popconfirm>
          )}
          {canReissue && (
            <Popconfirm
              title="Reissue this invoice?"
              description="This will void the current invoice and create a new draft from the same waybill."
              onConfirm={handleReissue}
              okText="Reissue"
            >
              <Button icon={<RedoOutlined />} loading={reissuing}>
                Reissue
              </Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      {/* Two-panel layout */}
      <Layout style={{ background: "transparent" }}>
        {editMode && (
          <Sider
            width={380}
            style={{
              background: "var(--color-bg-container)",
              borderRight: "1px solid var(--color-border)",
              height: "calc(100vh - 64px)",
              overflow: "auto",
            }}
          >
            <InvoiceForm
              invoice={localInvoice}
              onChange={handleChange}
              readOnly={!isDraft}
            />
          </Sider>
        )}
        <Content
          style={{
            padding: 24,
            display: "flex",
            justifyContent: "center",
            overflow: "auto",
            height: "calc(100vh - 64px)",
            background: "#e8e5e0",
          }}
        >
          <div
            ref={printRef}
            style={{
              transform: "scale(0.75)",
              transformOrigin: "top center",
              marginBottom: -200,
            }}
          >
            <InvoicePrintView invoice={localInvoice} />
          </div>
        </Content>
      </Layout>
    </div>
  );
};
