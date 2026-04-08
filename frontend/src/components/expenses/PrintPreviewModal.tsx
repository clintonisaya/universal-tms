"use client";

import { useEffect, useState } from "react";
import { Modal, Button, Spin, message } from "antd";
import { PrinterOutlined } from "@ant-design/icons";
import type { ExpenseRequestDetailed } from "@/types/expense";
import { sanitizeHtml } from "@/lib/sanitize";

interface PrintPreviewModalProps {
  open: boolean;
  onClose: () => void;
  expenseIds: string[];
}

export function PrintPreviewModal({
  open,
  onClose,
  expenseIds,
}: PrintPreviewModalProps) {
  const [expenses, setExpenses] = useState<ExpenseRequestDetailed[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && expenseIds.length > 0) {
      fetchExpenses();
    }
  }, [open, expenseIds]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const responses = await Promise.all(
        expenseIds.map((id) =>
          fetch(`/api/v1/expenses/${id}`, { credentials: "include" }).then(
            (res) => (res.ok ? res.json() : null)
          )
        )
      );
      const validExpenses = responses.filter(
        (e): e is ExpenseRequestDetailed => e !== null
      );
      setExpenses(validExpenses);
      if (validExpenses.length === 0) {
        message.error("No valid expenses found");
      }
    } catch {
      message.error("Failed to load vouchers");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById("print-voucher-content");
    if (!printContent) return;

    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) {
      message.error("Please allow popups to print");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Vouchers</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; }
            .voucher-page {
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              page-break-after: always;
            }
            .voucher-page:last-child {
              page-break-after: avoid;
            }
            .voucher-border {
              border: 2px solid #000;
              padding: 30px;
              min-height: 600px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .header p {
              margin: 5px 0 0 0;
              font-size: 14px;
            }
            .header h2 {
              margin-top: 20px;
              text-decoration: underline;
            }
            .details-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            .details-grid p {
              margin: 8px 0;
            }
            .amount-box {
              background: #f0f0f0;
              padding: 15px;
              margin-bottom: 30px;
              border: 1px solid #ddd;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .amount-label {
              font-size: 16px;
              font-weight: bold;
            }
            .amount-value {
              font-size: 20px;
              font-weight: bold;
            }
            .description-section {
              margin-bottom: 50px;
            }
            .description-box {
              border: 1px solid #ccc;
              padding: 10px;
              min-height: 80px;
              background: #fafafa;
              margin-top: 8px;
            }
            .signatures {
              display: flex;
              justify-content: space-between;
              margin-top: 100px;
            }
            .signature-block {
              text-align: center;
              width: 40%;
            }
            .signature-line {
              border-bottom: 1px solid #000;
              margin-bottom: 10px;
              height: 30px;
            }
            .signature-block p {
              margin: 5px 0;
            }
            .signature-title {
              font-size: 12px;
            }
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${sanitizeHtml(printContent.innerHTML)}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Modal
      title="Print Preview"
      open={open}
      onCancel={onClose}
      width={900}
      centered
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="print"
          type="primary"
          icon={<PrinterOutlined />}
          onClick={handlePrint}
          disabled={loading || expenses.length === 0}
        >
          Print {expenses.length > 1 ? `All (${expenses.length})` : ""}
        </Button>,
      ]}
      styles={{
        body: {
          maxHeight: "70vh",
          overflowY: "auto",
          background: "#f5f5f5",
          padding: "20px",
        },
      }}
    >
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 50 }}>
          <Spin size="large" />
        </div>
      ) : expenses.length === 0 ? (
        <div style={{ textAlign: "center", padding: 50 }}>No vouchers to print</div>
      ) : (
        <div id="print-voucher-content">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="voucher-page"
              style={{
                padding: "40px",
                maxWidth: "800px",
                margin: "0 auto 20px auto",
                background: "white",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              <div className="voucher-border" style={{ border: "2px solid #000", padding: "30px", minHeight: "600px" }}>
                {/* Header */}
                <div
                  className="header"
                  style={{
                    textAlign: "center",
                    borderBottom: "2px solid #000",
                    paddingBottom: "20px",
                    marginBottom: "30px",
                  }}
                >
                  <h1 style={{ margin: 0, fontSize: "24px", textTransform: "uppercase", letterSpacing: "1px" }}>
                    Africa Wakawaka Logistics Co. Limited
                  </h1>
                  <p style={{ margin: "5px 0 0 0", fontSize: "14px" }}>
                    P.O. Box 12345, Nairobi, Kenya | Tel: +254 700 000000
                  </p>
                  <h2 style={{ marginTop: "20px", textDecoration: "underline" }}>
                    PAYMENT VOUCHER
                  </h2>
                </div>

                {/* Details Grid */}
                <div
                  className="details-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "20px",
                    marginBottom: "30px",
                  }}
                >
                  <div>
                    <p><strong>Voucher No:</strong> <span style={{ fontFamily: "monospace", fontSize: "16px" }}>{expense.expense_number || expense.id.slice(0, 8).toUpperCase()}</span></p>
                    <p><strong>Date:</strong> {expense.payment_date ? new Date(expense.payment_date).toLocaleDateString() : new Date(expense.created_at || "").toLocaleDateString()}</p>
                    <p><strong>Payment Method:</strong> {expense.payment_method || "CASH"}</p>
                  </div>
                  <div>
                    <p><strong>Payee:</strong> {expense.created_by?.full_name}</p>
                    <p><strong>Reference:</strong> {expense.payment_reference || "N/A"}</p>
                    <p><strong>Category:</strong> {expense.category}</p>
                  </div>
                </div>

                {/* Amount Box */}
                <div
                  className="amount-box"
                  style={{
                    background: "#f0f0f0",
                    padding: "15px",
                    marginBottom: "30px",
                    border: "1px solid #ddd",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span className="amount-label" style={{ fontSize: "16px", fontWeight: "bold" }}>AMOUNT PAID:</span>
                  <span className="amount-value" style={{ fontSize: "20px", fontWeight: "bold" }}>
                    {expense.currency || "TZS"} {Number(expense.amount).toLocaleString("en-US")}
                  </span>
                </div>

                {/* Description */}
                <div className="description-section" style={{ marginBottom: "50px" }}>
                  <p><strong>Description / Remarks:</strong></p>
                  <div
                    className="description-box"
                    style={{
                      border: "1px solid #ccc",
                      padding: "10px",
                      minHeight: "80px",
                      background: "#fafafa",
                      marginTop: "8px",
                    }}
                  >
                    {expense.description}
                  </div>
                </div>

                {/* Signatures */}
                <div
                  className="signatures"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "100px",
                  }}
                >
                  <div className="signature-block" style={{ textAlign: "center", width: "40%" }}>
                    <div className="signature-line" style={{ borderBottom: "1px solid #000", marginBottom: "10px", height: "30px" }}></div>
                    <p><strong>Prepared By</strong></p>
                    <p className="signature-title" style={{ fontSize: "12px" }}>(Finance Officer)</p>
                  </div>
                  <div className="signature-block" style={{ textAlign: "center", width: "40%" }}>
                    <div className="signature-line" style={{ borderBottom: "1px solid #000", marginBottom: "10px", height: "30px" }}></div>
                    <p><strong>Received By</strong></p>
                    <p className="signature-title" style={{ fontSize: "12px" }}>{expense.created_by?.full_name}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
