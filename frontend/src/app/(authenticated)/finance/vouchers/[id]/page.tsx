"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Spin, Button, message } from "antd";
import { PrinterOutlined } from "@ant-design/icons";
import type { ExpenseRequestDetailed } from "@/types/expense";

export default function VoucherPage() {
  const params = useParams();
  const [expense, setExpense] = useState<ExpenseRequestDetailed | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExpense = async () => {
      try {
        const response = await fetch(`/api/v1/expenses/${params.id}`, {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setExpense(data);
        } else {
          message.error("Failed to load voucher details");
        }
      } catch {
        message.error("Network error");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchExpense();
    }
  }, [params.id]);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 50 }}><Spin size="large" /></div>;
  if (!expense) return <div style={{ padding: 50, textAlign: "center" }}>Voucher not found</div>;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="voucher-container" style={{ padding: "40px", maxWidth: "800px", margin: "0 auto", background: "white" }}>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .voucher-container, .voucher-container * {
            visibility: visible;
          }
          .voucher-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="no-print" style={{ marginBottom: 20, textAlign: "right" }}>
        <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
          Print Voucher
        </Button>
      </div>

      <div style={{ border: "2px solid #000", padding: "30px", minHeight: "600px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: "20px", marginBottom: "30px" }}>
          <h1 style={{ margin: "0", fontSize: "24px", textTransform: "uppercase", letterSpacing: "1px" }}>
            Africa Wakawaka Logistics Co. Limited
          </h1>
          <p style={{ margin: "5px 0 0 0", fontSize: "14px" }}>
            P.O. Box 12345, Nairobi, Kenya | Tel: +254 700 000000
          </p>
          <h2 style={{ marginTop: "20px", textDecoration: "underline" }}>PAYMENT VOUCHER</h2>
        </div>

        {/* Details Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "30px" }}>
          <div>
            <p><strong>Voucher No:</strong> <span style={{ fontFamily: "monospace", fontSize: "16px" }}>{expense.expense_number || expense.id.slice(0, 8).toUpperCase()}</span></p>
            <p><strong>Date:</strong> {expense.payment_date ? new Date(expense.payment_date).toLocaleDateString() : "-"}</p>
            <p><strong>Payment Method:</strong> {expense.payment_method || "CASH"}</p>
          </div>
          <div>
            <p><strong>Payee:</strong> {expense.created_by?.full_name}</p>
            <p><strong>Reference:</strong> {expense.payment_reference || "N/A"}</p>
            <p><strong>Category:</strong> {expense.category}</p>
          </div>
        </div>

        {/* Amount Box */}
        <div style={{ background: "#f0f0f0", padding: "15px", marginBottom: "30px", border: "1px solid #ddd" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "16px", fontWeight: "bold" }}>AMOUNT PAID:</span>
            <span style={{ fontSize: "20px", fontWeight: "bold" }}>
              {expense.currency || "TZS"} {Number(expense.amount).toLocaleString("en-US")}
            </span>
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: "50px" }}>
            <p><strong>Description / Remarks:</strong></p>
            <div style={{ border: "1px solid #ccc", padding: "10px", minHeight: "80px", background: "#fafafa" }}>
                {expense.description}
            </div>
        </div>

        {/* Signatures */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "100px" }}>
            <div style={{ textAlign: "center", width: "40%" }}>
                <div style={{ borderBottom: "1px solid #000", marginBottom: "10px" }}></div>
                <p><strong>Prepared By</strong></p>
                <p style={{ fontSize: "12px" }}>(Finance Officer)</p>
            </div>
            <div style={{ textAlign: "center", width: "40%" }}>
                <div style={{ borderBottom: "1px solid #000", marginBottom: "10px" }}></div>
                <p><strong>Received By</strong></p>
                <p style={{ fontSize: "12px" }}>{expense.created_by?.full_name}</p>
            </div>
        </div>
      </div>
    </div>
  );
}
