"use client";

import { useEffect, useState } from "react";
import { Modal, Button, Spin, message } from "antd";
import { PrinterOutlined } from "@ant-design/icons";
import type { ExpenseRequestDetailed } from "@/types/expense";
import { sanitizeHtml } from "@/lib/sanitize";

interface OfficePaymentPrintLayoutProps {
  open: boolean;
  onClose: () => void;
  expenseIds: string[];
}

export function OfficePaymentPrintLayout({
  open,
  onClose,
  expenseIds,
}: OfficePaymentPrintLayoutProps) {
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
      message.error("Failed to load payment applications");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById("office-payment-print-content");
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
          <title>Office Expense Application</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              font-size: 11pt;
              line-height: 1.4;
              color: #000;
              background: #fff;
            }
            .page {
              width: 210mm;
              min-height: 297mm;
              padding: 10mm;
              margin: 0 auto;
              background: #fff;
              page-break-after: always;
            }
            .page:last-child {
              page-break-after: avoid;
            }

            /* Header */
            .header {
              display: flex;
              align-items: center;
              position: relative;
              margin-bottom: 15px;
              padding-bottom: 15px;
              border-bottom: 2px solid #000;
            }
            .document-title h1 {
              font-size: 16pt;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin: 0;
            }

            /* Section Title */
            .section-title {
              font-size: 10pt;
              font-weight: bold;
              text-transform: uppercase;
              background: #f0f0f0;
              padding: 5px 10px;
              margin: 15px 0 10px 0;
              border-left: 3px solid #333;
            }

            /* Info Table */
            .info-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
            }
            .info-table td {
              padding: 6px 10px;
              border: 1px solid #ccc;
              vertical-align: top;
            }
            .info-table .label {
              width: 35%;
              font-weight: 600;
              background: #f9f9f9;
            }
            .info-table .value {
              width: 65%;
            }

            /* Bank Details Box */
            .bank-details {
              border: 2px solid #333;
              padding: 12px;
              margin: 15px 0;
              background: #fafafa;
            }
            .bank-details-grid {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 10px;
            }
            .bank-detail-item label {
              display: block;
              font-size: 9pt;
              color: #666;
            }
            .bank-detail-item span {
              font-weight: 600;
            }

            /* Remarks Box */
            .remarks-box {
              border: 1px solid #ccc;
              padding: 12px;
              min-height: 60px;
              background: #fafafa;
              margin-bottom: 15px;
            }

            /* Expense Table */
            .expense-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
            }
            .expense-table th {
              background: #333;
              color: #fff;
              padding: 8px 6px;
              text-align: left;
              font-size: 9pt;
              font-weight: 600;
            }
            .expense-table th.amount,
            .expense-table td.amount {
              text-align: right;
            }
            .expense-table td {
              padding: 8px 6px;
              border: 1px solid #ddd;
              font-size: 10pt;
            }
            .expense-table tr:nth-child(even) td {
              background: #f5f5f5;
            }
            .expense-table .total-row td {
              background: #e8e8e8 !important;
              font-weight: bold;
              font-size: 11pt;
              border-top: 2px solid #333;
            }

            /* Approval Table */
            .approval-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
              font-size: 9pt;
            }
            .approval-table th {
              background: #f0f0f0;
              padding: 6px;
              text-align: left;
              border: 1px solid #ccc;
              font-weight: 600;
            }
            .approval-table td {
              padding: 6px;
              border: 1px solid #ccc;
            }

            /* Footer */
            .footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 1px solid #ccc;
              font-size: 9pt;
              color: #666;
              display: flex;
              justify-content: space-between;
            }

            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
              .page { margin: 0; padding: 10mm; }
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

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getApprovalStatus = (expense: ExpenseRequestDetailed) => {
    const steps = [];

    steps.push({
      step: 1,
      role: "Initiator",
      name: expense.created_by?.full_name || "-",
      date: expense.created_at,
      status: "Submitted",
      comment: "Initiated Application",
    });

    if (expense.approved_by) {
      steps.push({
        step: 2,
        role: "Manager",
        name: expense.approved_by?.full_name || "-",
        date: expense.approved_at,
        status: "Approved",
        comment: expense.manager_comment || "-",
      });
    } else if (expense.status === "Pending Manager") {
      steps.push({
        step: 2,
        role: "Manager",
        name: "-",
        date: null,
        status: "Pending",
        comment: "-",
      });
    } else if (expense.status === "Rejected") {
      steps.push({
        step: 2,
        role: "Manager",
        name: "-",
        date: null,
        status: "Rejected",
        comment: expense.manager_comment || "-",
      });
    } else if (expense.status === "Returned") {
      steps.push({
        step: 2,
        role: "Manager",
        name: "-",
        date: null,
        status: "Returned",
        comment: expense.manager_comment || "-",
      });
    }

    if (expense.paid_by) {
      steps.push({
        step: 3,
        role: "Finance",
        name: expense.paid_by?.full_name || "-",
        date: expense.payment_date,
        status: "Paid",
        comment: expense.payment_reference ? `Ref: ${expense.payment_reference}` : "-",
      });
    } else if (expense.status === "Pending Finance") {
      steps.push({
        step: 3,
        role: "Finance",
        name: "-",
        date: null,
        status: "Pending",
        comment: "-",
      });
    }

    return steps;
  };

  return (
    <Modal
      title="Office Expense Application - Print Preview"
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
          maxHeight: "75vh",
          overflowY: "auto",
          background: "#e0e0e0",
          padding: "20px",
        },
      }}
    >
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 50 }}>
          <Spin size="large" />
        </div>
      ) : expenses.length === 0 ? (
        <div style={{ textAlign: "center", padding: 50 }}>No payment applications to print</div>
      ) : (
        <div id="office-payment-print-content">
          {expenses.map((expense, pageIndex) => (
            <div
              key={expense.id}
              className="page"
              style={{
                width: "210mm",
                minHeight: "297mm",
                padding: "10mm",
                margin: "0 auto 20px auto",
                background: "#fff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
            >
              {/* Header */}
              <div className="header" style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "15px",
                paddingBottom: "15px",
                borderBottom: "2px solid #000",
                position: "relative",
              }}>
                <div className="document-title" style={{ position: "absolute", left: 0, right: 0, textAlign: "center", pointerEvents: "none" }}>
                  <h1 style={{
                    fontSize: "16pt",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    margin: 0,
                  }}>
                    OFFICE EXPENSE APPLICATION
                  </h1>
                </div>
              </div>

              {/* Basic Information */}
              <div className="section-title" style={{
                fontSize: "10pt",
                fontWeight: "bold",
                textTransform: "uppercase",
                background: "#f0f0f0",
                padding: "5px 10px",
                margin: "15px 0 10px 0",
                borderLeft: "3px solid #333",
              }}>
                Basic Information
              </div>
              <table className="info-table" style={{ width: "100%", borderCollapse: "collapse", marginBottom: "15px" }}>
                <tbody>
                  <tr>
                    <td className="label" style={{ width: "35%", fontWeight: 600, background: "#f9f9f9", padding: "6px 10px", border: "1px solid #ccc" }}>Form ID</td>
                    <td className="value" style={{ width: "65%", padding: "6px 10px", border: "1px solid #ccc", fontFamily: "monospace" }}>
                      {expense.expense_number || expense.id.slice(0, 12).toUpperCase()}
                    </td>
                  </tr>
                  <tr>
                    <td className="label" style={{ width: "35%", fontWeight: 600, background: "#f9f9f9", padding: "6px 10px", border: "1px solid #ccc" }}>Payment Company</td>
                    <td className="value" style={{ padding: "6px 10px", border: "1px solid #ccc" }}>Nablafleet Company Limited</td>
                  </tr>
                  <tr>
                    <td className="label" style={{ width: "35%", fontWeight: 600, background: "#f9f9f9", padding: "6px 10px", border: "1px solid #ccc" }}>Applicant</td>
                    <td className="value" style={{ padding: "6px 10px", border: "1px solid #ccc" }}>{expense.created_by?.full_name || "-"}</td>
                  </tr>
                  <tr>
                    <td className="label" style={{ width: "35%", fontWeight: 600, background: "#f9f9f9", padding: "6px 10px", border: "1px solid #ccc" }}>Application Date</td>
                    <td className="value" style={{ padding: "6px 10px", border: "1px solid #ccc" }}>{formatDate(expense.created_at)}</td>
                  </tr>
                  <tr>
                    <td className="label" style={{ width: "35%", fontWeight: 600, background: "#f9f9f9", padding: "6px 10px", border: "1px solid #ccc" }}>Payment Method</td>
                    <td className="value" style={{ padding: "6px 10px", border: "1px solid #ccc" }}>{expense.payment_method || expense.expense_metadata?.payment_method || "Cash"}</td>
                  </tr>
                  <tr>
                    <td className="label" style={{ width: "35%", fontWeight: 600, background: "#f9f9f9", padding: "6px 10px", border: "1px solid #ccc" }}>Bank Account</td>
                    <td className="value" style={{ padding: "6px 10px", border: "1px solid #ccc" }}>
                      {expense.expense_metadata?.bank_details ?
                        `${expense.expense_metadata.bank_details.bank_name || '-'} - ${expense.expense_metadata.bank_details.account_name || '-'} - ${expense.expense_metadata.bank_details.account_no || '-'}`
                        : "-"}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Remarks */}
              <div className="section-title" style={{
                fontSize: "10pt",
                fontWeight: "bold",
                textTransform: "uppercase",
                background: "#f0f0f0",
                padding: "5px 10px",
                margin: "15px 0 10px 0",
                borderLeft: "3px solid #333",
              }}>
                Remarks / Purpose
              </div>
              <div className="remarks-box" style={{
                border: "1px solid #ccc",
                padding: "12px",
                minHeight: "60px",
                background: "#fafafa",
                marginBottom: "15px",
              }}>
                {expense.description || "-"}
              </div>

              {/* Payment Details */}
              <div className="section-title" style={{
                fontSize: "10pt",
                fontWeight: "bold",
                textTransform: "uppercase",
                background: "#f0f0f0",
                padding: "5px 10px",
                margin: "15px 0 10px 0",
                borderLeft: "3px solid #333",
              }}>
                Payment Details
              </div>
              <table className="expense-table" style={{ width: "100%", borderCollapse: "collapse", marginBottom: "15px" }}>
                <thead>
                  <tr>
                    <th style={{ background: "#333", color: "#fff", padding: "8px 6px", textAlign: "left", fontSize: "9pt", fontWeight: 600, width: "40px" }}>No.</th>
                    <th style={{ background: "#333", color: "#fff", padding: "8px 6px", textAlign: "left", fontSize: "9pt", fontWeight: 600 }}>Payment Item</th>
                    <th style={{ background: "#333", color: "#fff", padding: "8px 6px", textAlign: "left", fontSize: "9pt", fontWeight: 600, width: "100px" }}>Receipt</th>
                    <th style={{ background: "#333", color: "#fff", padding: "8px 6px", textAlign: "right", fontSize: "9pt", fontWeight: 600, width: "120px" }}>Amount</th>
                    <th style={{ background: "#333", color: "#fff", padding: "8px 6px", textAlign: "left", fontSize: "9pt", fontWeight: 600, width: "60px" }}>Currency</th>
                    <th style={{ background: "#333", color: "#fff", padding: "8px 6px", textAlign: "left", fontSize: "9pt", fontWeight: 600 }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: "8px 6px", border: "1px solid #ddd", fontSize: "10pt" }}>1</td>
                    <td style={{ padding: "8px 6px", border: "1px solid #ddd", fontSize: "10pt" }}>{expense.expense_metadata?.item_name || expense.category}</td>
                    <td style={{ padding: "8px 6px", border: "1px solid #ddd", fontSize: "10pt" }}>{expense.expense_metadata?.invoice_state || "-"}</td>
                    <td style={{ padding: "8px 6px", border: "1px solid #ddd", fontSize: "10pt", textAlign: "right", fontFamily: "monospace" }}>
                      {Number(expense.amount).toLocaleString("en-US")}
                    </td>
                    <td style={{ padding: "8px 6px", border: "1px solid #ddd", fontSize: "10pt" }}>{expense.currency || "TZS"}</td>
                    <td style={{ padding: "8px 6px", border: "1px solid #ddd", fontSize: "10pt" }}>{expense.expense_metadata?.item_details || expense.description}</td>
                  </tr>
                  <tr className="total-row">
                    <td colSpan={3} style={{ padding: "8px 6px", border: "1px solid #ddd", fontSize: "11pt", fontWeight: "bold", background: "#e8e8e8", borderTop: "2px solid #333", textAlign: "right" }}>
                      TOTAL
                    </td>
                    <td style={{ padding: "8px 6px", border: "1px solid #ddd", fontSize: "11pt", fontWeight: "bold", background: "#e8e8e8", borderTop: "2px solid #333", textAlign: "right", fontFamily: "monospace" }}>
                      {Number(expense.amount).toLocaleString("en-US")}
                    </td>
                    <td style={{ padding: "8px 6px", border: "1px solid #ddd", fontSize: "11pt", fontWeight: "bold", background: "#e8e8e8", borderTop: "2px solid #333" }}>
                      {expense.currency || "TZS"}
                    </td>
                    <td style={{ padding: "8px 6px", border: "1px solid #ddd", background: "#e8e8e8", borderTop: "2px solid #333" }}></td>
                  </tr>
                </tbody>
              </table>

              {/* Approval Workflow */}
              <div className="section-title" style={{
                fontSize: "10pt",
                fontWeight: "bold",
                textTransform: "uppercase",
                background: "#f0f0f0",
                padding: "5px 10px",
                margin: "15px 0 10px 0",
                borderLeft: "3px solid #333",
              }}>
                Approval Workflow
              </div>
              <table className="approval-table" style={{ width: "100%", borderCollapse: "collapse", marginBottom: "15px", fontSize: "9pt" }}>
                <thead>
                  <tr>
                    <th style={{ background: "#f0f0f0", padding: "6px", textAlign: "left", border: "1px solid #ccc", fontWeight: 600 }}>Step</th>
                    <th style={{ background: "#f0f0f0", padding: "6px", textAlign: "left", border: "1px solid #ccc", fontWeight: 600 }}>Role</th>
                    <th style={{ background: "#f0f0f0", padding: "6px", textAlign: "left", border: "1px solid #ccc", fontWeight: 600 }}>Name</th>
                    <th style={{ background: "#f0f0f0", padding: "6px", textAlign: "left", border: "1px solid #ccc", fontWeight: 600 }}>Date & Time</th>
                    <th style={{ background: "#f0f0f0", padding: "6px", textAlign: "left", border: "1px solid #ccc", fontWeight: 600 }}>Status</th>
                    <th style={{ background: "#f0f0f0", padding: "6px", textAlign: "left", border: "1px solid #ccc", fontWeight: 600 }}>Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {getApprovalStatus(expense).map((step, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: "6px", border: "1px solid #ccc" }}>{step.step}</td>
                      <td style={{ padding: "6px", border: "1px solid #ccc" }}>{step.role}</td>
                      <td style={{ padding: "6px", border: "1px solid #ccc" }}>{step.name}</td>
                      <td style={{ padding: "6px", border: "1px solid #ccc" }}>{step.date ? formatDate(step.date) : "-"}</td>
                      <td style={{
                        padding: "6px",
                        border: "1px solid #ccc",
                        fontWeight: "bold",
                        color: step.status === "Approved" || step.status === "Paid" || step.status === "Submitted"
                          ? "#0a0"
                          : step.status === "Pending"
                          ? "#f90"
                          : "#c00"
                      }}>
                        {step.status}
                      </td>
                      <td style={{ padding: "6px", border: "1px solid #ccc" }}>{step.comment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Footer */}
              <div className="footer" style={{
                marginTop: "30px",
                paddingTop: "15px",
                borderTop: "1px solid #ccc",
                fontSize: "9pt",
                color: "#666",
                display: "flex",
                justifyContent: "space-between",
              }}>
                <div>Printed on: {new Date().toLocaleString("en-GB")}</div>
                <div>Nablafleet Transport Management System</div>
                <div>Page {pageIndex + 1} of {expenses.length}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
