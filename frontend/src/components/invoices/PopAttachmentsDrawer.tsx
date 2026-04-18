"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  List,
  Button,
  Upload,
  Typography,
  Spin,
  Space,
  Tag,
  Divider,
  message,
  Empty,
  Modal,
} from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import {
  DeleteOutlined,
  UploadOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileUnknownOutlined,
  DownloadOutlined,
  EyeOutlined,
  PaperClipOutlined,
} from "@ant-design/icons";
import { usePermissions } from "@/hooks/usePermissions";
import { useInvalidateQueries } from "@/hooks/useApi";
import { fmtCurrency } from "@/lib/utils";
import { getInvoiceDisplayNumber, type Invoice, type PopAttachmentsGroup, type PopAttachment } from "@/types/invoice";

const { Text, Title } = Typography;

function getFileIcon(contentType: string) {
  if (contentType === "application/pdf") return <FilePdfOutlined style={{ color: "var(--color-red)", fontSize: 18 }} />;
  if (contentType.startsWith("image/")) return <FileImageOutlined style={{ color: "var(--color-blue)", fontSize: 18 }} />;
  return <FileUnknownOutlined style={{ fontSize: 18 }} />;
}

function getPaymentTypeColor(type: string): string {
  switch (type) {
    case "full": return "green";
    case "advance": return "blue";
    case "balance": return "orange";
    default: return "default";
  }
}

interface PopAttachmentsDrawerProps {
  invoice: Invoice | null;
  open: boolean;
  onClose: () => void;
}

export function PopAttachmentsDrawer({ invoice, open, onClose }: PopAttachmentsDrawerProps) {
  const { hasFullAccess, hasPermission } = usePermissions();
  const invalidate = useInvalidateQueries();

  const [groups, setGroups] = useState<PopAttachmentsGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [attachToPaymentId, setAttachToPaymentId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFilename, setPreviewFilename] = useState<string>("");

  const canUpload = hasFullAccess || hasPermission("invoices:pop-manage");

  useEffect(() => {
    if (open && invoice?.id) {
      fetchAttachments();
    } else {
      setGroups([]);
      setFileList([]);
      setAttachToPaymentId(null);
    }
  }, [open, invoice?.id]);

  const fetchAttachments = async () => {
    if (!invoice) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/invoices/${invoice.id}/pop-attachments`, {
        credentials: "include",
      });
      if (response.ok) {
        setGroups(await response.json());
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!invoice) return;
    setDeletingId(attachmentId);
    try {
      const response = await fetch(
        `/api/v1/invoices/${invoice.id}/pop-attachments/${attachmentId}`,
        { method: "DELETE", credentials: "include" }
      );
      if (response.ok) {
        message.success("POP deleted");
        await fetchAttachments();
        invalidate.invalidatePopAttachments(invoice.id);
        invalidate.invalidateInvoicePayments(invoice.id);
      } else {
        message.error("Failed to delete");
      }
    } catch {
      message.error("Network error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpload = async () => {
    if (!invoice || !attachToPaymentId || fileList.length === 0) return;
    setUploading(true);
    try {
      for (const file of fileList) {
        const fileToUpload = file.originFileObj;
        if (fileToUpload) {
          const formData = new FormData();
          formData.append("file", fileToUpload as Blob);
          const response = await fetch(
            `/api/v1/invoices/${invoice.id}/payments/${attachToPaymentId}/attachment`,
            { method: "POST", credentials: "include", body: formData }
          );
          if (!response.ok) {
            message.error(`Failed to upload ${file.name}`);
          }
        }
      }
      message.success("POP uploaded");
      setFileList([]);
      setAttachToPaymentId(null);
      await fetchAttachments();
      invalidate.invalidatePopAttachments(invoice.id);
      invalidate.invalidateInvoicePayments(invoice.id);
    } catch {
      message.error("Network error during upload");
    } finally {
      setUploading(false);
    }
  };

  const openPreview = (att: PopAttachment) => {
    if (att.content_type.startsWith("image/") && att.url) {
      setPreviewUrl(att.url);
      setPreviewFilename(att.filename);
    }
  };

  if (!invoice) return null;

  return (
    <>
      <Drawer
        title={
          <Space>
            <PaperClipOutlined />
            <span>POP Attachments — {getInvoiceDisplayNumber(invoice)}</span>
          </Space>
        }
        open={open}
        onClose={() => {
          setFileList([]);
          setAttachToPaymentId(null);
          onClose();
        }}
        width={520}
        destroyOnHidden
      >
        <Spin spinning={loading}>
          {groups.length === 0 && !loading ? (
            <Empty description="No payments recorded yet" />
          ) : (
            groups.map((group) => (
              <div key={group.payment_id} style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <Space>
                    <Tag color={getPaymentTypeColor(group.payment_type)}>
                      {group.payment_type.charAt(0).toUpperCase() + group.payment_type.slice(1)}
                    </Tag>
                    <Text strong>{fmtCurrency(group.amount, invoice.currency)}</Text>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {new Date(group.payment_date).toLocaleDateString("en-GB", {
                      year: "numeric", month: "short", day: "2-digit",
                    })}
                  </Text>
                </div>

                {group.attachments.length === 0 ? (
                  <div style={{ padding: "8px 0 4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Text type="secondary" italic>No POP attached</Text>
                    {canUpload && (
                      <Button
                        size="small"
                        type="link"
                        icon={<UploadOutlined />}
                        onClick={() => setAttachToPaymentId(group.payment_id)}
                      >
                        Attach POP
                      </Button>
                    )}
                  </div>
                ) : (
                  <List
                    dataSource={group.attachments}
                    renderItem={(att) => (
                      <List.Item
                        style={{ padding: "6px 0" }}
                        actions={[
                          att.content_type.startsWith("image/") && att.url ? (
                            <Button
                              key="preview"
                              type="link"
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={() => openPreview(att)}
                            />
                          ) : null,
                          att.url ? (
                            <Button
                              key="download"
                              type="link"
                              size="small"
                              icon={<DownloadOutlined />}
                              href={att.url}
                              target="_blank"
                            />
                          ) : null,
                          canUpload ? (
                            <Button
                              key="delete"
                              type="link"
                              danger
                              size="small"
                              icon={<DeleteOutlined />}
                              loading={deletingId === att.id}
                              onClick={() => handleDelete(att.id)}
                            />
                          ) : null,
                        ].filter(Boolean)}
                      >
                        <Space>
                          {getFileIcon(att.content_type)}
                          <Text ellipsis style={{ maxWidth: 240 }}>
                            {att.filename}
                          </Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                )}

                {/* Show "+ Attach POP" below existing attachments too */}
                {canUpload && group.attachments.length > 0 && (
                  <Button
                    size="small"
                    type="link"
                    icon={<UploadOutlined />}
                    style={{ padding: 0, marginTop: 4 }}
                    onClick={() => setAttachToPaymentId(group.payment_id)}
                  >
                    + Attach POP
                  </Button>
                )}

                <Divider style={{ margin: "12px 0" }} />
              </div>
            ))
          )}
        </Spin>
      </Drawer>

      {/* Upload modal scoped to a specific payment */}
      <Modal
        title="Upload Proof of Payment"
        open={!!attachToPaymentId}
        onCancel={() => {
          setFileList([]);
          setAttachToPaymentId(null);
        }}
        footer={
          <Space>
            <Button onClick={() => { setFileList([]); setAttachToPaymentId(null); }}>
              Cancel
            </Button>
            <Button
              type="primary"
              loading={uploading}
              disabled={fileList.length === 0}
              onClick={handleUpload}
            >
              Upload {fileList.length > 0 ? `${fileList.length} file${fileList.length > 1 ? "s" : ""}` : ""}
            </Button>
          </Space>
        }
        width={480}
        destroyOnHidden
      >
        <Upload
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          fileList={fileList}
          beforeUpload={(file) => {
            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
              message.error(`${file.name} exceeds the 5 MB limit`);
              return Upload.LIST_IGNORE;
            }
            const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
            if (!allowed.includes(file.type)) {
              message.error(`${file.name}: unsupported type. Use PDF, JPEG, PNG, or WebP.`);
              return Upload.LIST_IGNORE;
            }
            setFileList((prev) => [...prev, file as UploadFile]);
            return false;
          }}
          onRemove={(file) => {
            setFileList((prev) => prev.filter((f) => f.uid !== file.uid));
          }}
        >
          <Button icon={<UploadOutlined />}>Select File</Button>
        </Upload>
        <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
          Accepted: PDF, JPEG, PNG, WebP · Max 5 MB
        </Text>
      </Modal>

      {/* Image preview modal */}
      <Modal
        open={!!previewUrl}
        footer={null}
        onCancel={() => { setPreviewUrl(null); setPreviewFilename(""); }}
        title={previewFilename}
        width="auto"
        centered
      >
        {previewUrl && (
          <img
            src={previewUrl}
            alt={previewFilename}
            style={{ maxWidth: "100%", maxHeight: "70vh" }}
          />
        )}
      </Modal>
    </>
  );
}

export default PopAttachmentsDrawer;
