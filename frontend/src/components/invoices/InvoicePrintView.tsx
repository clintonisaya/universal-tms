/**
 * InvoicePrintView — Pure HTML/CSS A4 invoice (no Ant Design).
 * Ported from nablafleet-invoice-generator.jsx.
 * Always renders in light/print mode regardless of app theme.
 */
import React, { useState, useEffect } from "react";
import type { Invoice, BankDetails } from "@/types/invoice";

// Brand colors (always light mode for print)
const PRIMARY = "#2563EB";
const PRIMARY_HOVER = "#1D4ED8";
const DARK = "#09090B";
const DARK_CARD = "#09090B";
const BORDER = "#E4E4E7";
const TEXT = "#09090B";
const TEXT_SEC = "#71717A";
const TEXT_MUT = "#A1A1AA";
const WHITE = "#FFFFFF";

const formatNum = (n: number) => {
  if (n === 0 || n === undefined) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const formatDate = (d: string | null) => {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" });
};

interface InvoicePrintViewProps {
  invoice: Invoice;
}

export const InvoicePrintView: React.FC<InvoicePrintViewProps> = ({ invoice }) => {
  const items = invoice.items || [];
  const subtotal = items.reduce((s, i) => s + (i.qty || 1) * (i.unit_price || 0), 0);
  const vat = subtotal * (Number(invoice.vat_rate) / 100);
  const totalUsd = subtotal + vat;
  const totalTzs = totalUsd * Number(invoice.exchange_rate);

  // Draft invoices fetch live bank details from company settings;
  // issued/paid/voided invoices use the snapshotted values.
  const [liveBank, setLiveBank] = useState<{ tzs: BankDetails; usd: BankDetails } | null>(null);

  useEffect(() => {
    if (invoice.status !== "draft") return;
    let cancelled = false;
    fetch("/api/v1/company-settings", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setLiveBank({
          tzs: {
            bank: data.bank_name_tzs || "",
            account: data.bank_account_tzs || "",
            name: data.bank_account_name || "",
            currency: data.bank_currency_tzs || "",
          },
          usd: {
            bank: data.bank_name_usd || "",
            account: data.bank_account_usd || "",
            name: data.bank_account_name || "",
            currency: data.bank_currency_usd || "",
          },
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [invoice.status]);

  const bankTzs = (invoice.status === "draft" && liveBank ? liveBank.tzs : invoice.bank_details_tzs) || {};
  const bankUsd = (invoice.status === "draft" && liveBank ? liveBank.usd : invoice.bank_details_usd) || {};

  return (
    <div
      id="invoice-print-area"
      style={{
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        color: TEXT,
        background: WHITE,
        width: "210mm",
        minHeight: "297mm",
        padding: 0,
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* === HEADER BANNER === */}
      <div style={{ display: "flex", alignItems: "stretch", background: DARK_CARD, minHeight: 130, position: "relative", overflow: "hidden" }}>
        <div style={{ flex: 1, padding: "22px 24px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: PRIMARY, letterSpacing: "0.02em", marginBottom: 4 }}>
            {invoice.company_name}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", lineHeight: 1.7 }}>
            <span>TEL: {invoice.company_phone}</span><br />
            <span style={{ fontWeight: 600, color: PRIMARY }}>Email: </span><span>{invoice.company_email}</span><br />
            <span>{invoice.company_address}</span>
          </div>
        </div>
        <div style={{ width: 80, position: "relative" }}>
          <div style={{ position: "absolute", top: 0, right: 0, width: 60, height: "100%", background: DARK, transform: "skewX(-12deg)", transformOrigin: "top right" }} />
          <div style={{ position: "absolute", top: "35%", right: 15, width: 8, height: 8, borderRadius: "50%", background: PRIMARY }} />
          <div style={{ position: "absolute", top: "35%", right: 28, width: 50, height: 2, background: PRIMARY, opacity: 0.7 }} />
          <div style={{ position: "absolute", top: "50%", right: 20, width: 6, height: 6, borderRadius: "50%", background: PRIMARY_HOVER }} />
          <div style={{ position: "absolute", top: "50%", right: 30, width: 40, height: 2, background: PRIMARY_HOVER, opacity: 0.5 }} />
        </div>
      </div>

      {/* === INVOICE TITLE BAR === */}
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 40px" }}>
        <div style={{ display: "flex", gap: 0 }}>
          <div style={{ background: PRIMARY, padding: "8px 24px", fontSize: 11, fontWeight: 700, color: WHITE, letterSpacing: "0.1em" }}>
            COMMERCIAL INVOICE
          </div>
        </div>
      </div>

      {/* === BODY CONTENT === */}
      <div style={{ padding: "12px 40px 20px" }}>
        {/* Company + Invoice meta row */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{invoice.company_name}</div>
            <div style={{ fontSize: 10, color: TEXT_SEC, lineHeight: 1.6 }}>
              {invoice.company_address}<br />
              TIN: {invoice.company_tin}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <table style={{ borderCollapse: "collapse", marginLeft: "auto" }}>
              <thead>
                <tr>
                  <th style={{ background: PRIMARY, color: WHITE, padding: "6px 20px", fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", border: `1px solid ${PRIMARY}` }}>INVOICE #</th>
                  <th style={{ background: PRIMARY, color: WHITE, padding: "6px 20px", fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", border: `1px solid ${PRIMARY}` }}>DATE</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: "6px 20px", fontSize: 12, fontWeight: 600, textAlign: "center", border: `1px solid ${BORDER}` }}>{invoice.invoice_number}</td>
                  <td style={{ padding: "6px 20px", fontSize: 12, textAlign: "center", border: `1px solid ${BORDER}` }}>{formatDate(invoice.date)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* PHONE + EMAIL */}
        <div style={{ fontSize: 10, color: TEXT_SEC, marginBottom: 12 }}>
          <strong>Phone:</strong> {invoice.company_phone} &nbsp;|&nbsp; <strong>Email:</strong> {invoice.company_email}
        </div>

        {/* TO / CUSTOMER section */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ background: DARK, color: WHITE, padding: "5px 12px", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 4, display: "inline-block" }}>BILL TO</div>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>{invoice.customer_name}</div>
            {invoice.customer_tin && <div style={{ fontSize: 10, color: TEXT_SEC, marginTop: 2 }}>TIN: {invoice.customer_tin}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: TEXT_MUT, fontWeight: 600, letterSpacing: "0.05em", marginBottom: 4 }}>REGARDING</div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{invoice.regarding}</div>
          </div>
        </div>

        {/* === LINE ITEMS TABLE === */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 4 }}>
          <thead>
            <tr>
              <th style={{ background: DARK, color: WHITE, padding: "8px 12px", fontSize: 10, fontWeight: 700, textAlign: "left", letterSpacing: "0.04em" }}>DESCRIPTION</th>
              <th style={{ background: DARK, color: WHITE, padding: "8px 12px", fontSize: 10, fontWeight: 700, textAlign: "center", letterSpacing: "0.04em", width: 50 }}>QTY</th>
              <th style={{ background: DARK, color: WHITE, padding: "8px 12px", fontSize: 10, fontWeight: 700, textAlign: "right", letterSpacing: "0.04em", width: 90 }}>UNIT PRICE</th>
              <th style={{ background: DARK, color: WHITE, padding: "8px 12px", fontSize: 10, fontWeight: 700, textAlign: "center", letterSpacing: "0.04em", width: 80 }}>SCHEDULE</th>
              <th style={{ background: DARK, color: WHITE, padding: "8px 12px", fontSize: 10, fontWeight: 700, textAlign: "right", letterSpacing: "0.04em", width: 100 }}>AMOUNT (USD)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                <td style={{ padding: "10px 12px", fontSize: 11, lineHeight: 1.5 }}>
                  <div>TRANSPORTATION: {item.route}</div>
                  <div style={{ color: TEXT_SEC, fontSize: 10, marginTop: 2 }}>{item.truck_plate}/{item.trailer_plate}</div>
                </td>
                <td style={{ padding: "10px 12px", fontSize: 11, textAlign: "center" }}>{item.qty}</td>
                <td style={{ padding: "10px 12px", fontSize: 11, textAlign: "right", fontFamily: "'Fira Code', monospace" }}>{formatNum(item.unit_price)}</td>
                <td style={{ padding: "10px 12px", fontSize: 11, textAlign: "center" }}>{item.payment_schedule}</td>
                <td style={{ padding: "10px 12px", fontSize: 11, textAlign: "right", fontWeight: 600, fontFamily: "'Fira Code', monospace" }}>{formatNum(item.qty * item.unit_price)}</td>
              </tr>
            ))}
            {Array.from({ length: Math.max(0, 4 - items.length) }).map((_, i) => (
              <tr key={`empty-${i}`} style={{ borderBottom: `1px solid ${BORDER}` }}>
                <td style={{ padding: "10px 12px" }}>&nbsp;</td>
                <td /><td /><td /><td />
              </tr>
            ))}
          </tbody>
        </table>

        {/* === BANK DETAILS + TOTALS === */}
        <div style={{ display: "flex", gap: 24, marginTop: 4 }}>
          <div style={{ flex: 1, fontSize: 9.5, color: TEXT_SEC, lineHeight: 1.7 }}>
            <div style={{ fontWeight: 700, color: TEXT, fontSize: 10, marginBottom: 6 }}>BANKING DETAILS</div>
            <div style={{ marginBottom: 10, padding: "8px 10px", background: "#FAFAF8", borderRadius: 4, border: `1px solid ${BORDER}` }}>
              <div style={{ fontWeight: 600, color: TEXT }}>{bankTzs.bank}</div>
              <div>A/C No. <strong>{bankTzs.account}</strong></div>
              <div>Name: {bankTzs.name}</div>
              <div style={{ color: PRIMARY_HOVER, fontWeight: 600 }}>({bankTzs.currency})</div>
            </div>
            <div style={{ padding: "8px 10px", background: "#FAFAF8", borderRadius: 4, border: `1px solid ${BORDER}` }}>
              <div style={{ fontWeight: 600, color: TEXT }}>{bankUsd.bank}</div>
              <div>A/C No. <strong>{bankUsd.account}</strong></div>
              <div>Name: {bankUsd.name}</div>
              <div style={{ color: PRIMARY_HOVER, fontWeight: 600 }}>({bankUsd.currency} Account)</div>
            </div>
          </div>
          <div style={{ width: 260 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: "8px 12px", fontSize: 11, fontWeight: 600 }}>SUBTOTAL</td>
                  <td style={{ padding: "8px 12px", fontSize: 11, textAlign: "right", fontFamily: "'Fira Code', monospace" }}>{formatNum(subtotal)}</td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: "8px 12px", fontSize: 11, color: TEXT_SEC }}>VAT ({Number(invoice.vat_rate)}%)</td>
                  <td style={{ padding: "8px 12px", fontSize: 11, textAlign: "right", fontFamily: "'Fira Code', monospace", color: TEXT_SEC }}>{formatNum(vat)}</td>
                </tr>
                <tr style={{ background: DARK }}>
                  <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 800, color: WHITE }}>TOTAL — USD</td>
                  <td style={{ padding: "10px 12px", fontSize: 14, fontWeight: 800, textAlign: "right", color: PRIMARY, fontFamily: "'Fira Code', monospace" }}>{formatNum(totalUsd)}</td>
                </tr>
                <tr style={{ background: PRIMARY }}>
                  <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 800, color: WHITE }}>TOTAL — TZS</td>
                  <td style={{ padding: "10px 12px", fontSize: 14, fontWeight: 800, textAlign: "right", color: WHITE, fontFamily: "'Fira Code', monospace" }}>{formatNum(totalTzs)}</td>
                </tr>
              </tbody>
            </table>
            <div style={{ textAlign: "center", marginTop: 16, fontSize: 10, color: TEXT_MUT }}>
              Exchange Rate: 1 USD = {formatNum(Number(invoice.exchange_rate))} TZS
            </div>
          </div>
        </div>

        {/* Thank you + contact */}
        <div style={{ marginTop: 28, textAlign: "center", borderTop: `2px solid ${PRIMARY}`, paddingTop: 16 }}>
          <div style={{ fontSize: 12, fontStyle: "italic", fontWeight: 600, color: PRIMARY_HOVER, marginBottom: 6 }}>Thank you for your business!</div>
          <div style={{ fontSize: 9.5, color: TEXT_SEC }}>
            If you have any questions about this invoice, please contact<br />
            <strong>{invoice.company_phone}</strong> | <strong>{invoice.company_email}</strong>
          </div>
        </div>
      </div>

      {/* === FOOTER BANNER === */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 40, overflow: "hidden" }}>
        <div style={{ width: "85%", height: "100%", background: PRIMARY, position: "absolute", left: 0, bottom: 0 }} />
        <div style={{ width: "8%", height: "100%", background: WHITE, position: "absolute", right: "7%", bottom: 0, transform: "skewX(-12deg)" }} />
        <div style={{ width: "12%", height: "100%", background: PRIMARY_HOVER, position: "absolute", right: 0, bottom: 0 }} />
      </div>
    </div>
  );
};
