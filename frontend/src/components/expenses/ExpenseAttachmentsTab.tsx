"use client";

import { useState, useEffect } from "react";
import { Button, Spin, Empty, Upload, Space, Typography, App } from "antd";
import {
  DownloadOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileWordOutlined,
  FileUnknownOutlined,
  UndoOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import type { ExpenseRequestDetailed } from "@/types/expense";

const { Text } = Typography;

interface AttachmentInfo {
  key: string;
  filename: string;
  url: string | null;
}

function getFileIcon(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf"))
    return <FilePdfOutlined style={{ color: "var(--color-red)", fontSize: 18 }} />;
  if (lower.match(/\.(jpe?g|png|gif|webp)$/))
    return <FileImageOutlined style={{ color: "var(--color-blue)", fontSize: 18 }} />;
  if (lower.match(/\.(docx?)$/))
    return <FileWordOutlined style={{ color: "var(--color-blue)", fontSize: 18 }} />;
  return <FileUnknownOutlined style={{ fontSize: 18 }} />;
}

interface ExpenseAttachmentsTabProps {
  expense: ExpenseRequestDetailed;
  editable: boolean;
}

export function ExpenseAttachmentsTab({ expense, editable }: ExpenseAttachmentsTabProps) {
  const { message } = App.useApp();
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentError, setAttachmentError] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const fetchAttachments = async () => {
    if (!expense?.id) return;
    setAttachmentsLoading(true);
    setAttachmentError(false);
    try {
      const response = await fetch(
        `/api/v1/expenses/${expense.id}/attachments`,
        { credentials: "include" }
      );
      if (response.ok) {
        setAttachments(await response.json());
      } else {
        setAttachments([]);
        setAttachmentError(true);
      }
    } catch {
      setAttachments([]);
      setAttachmentError(true);
    } finally {
      setAttachmentsLoading(false);
    }
  };

  useEffect(() => {
    if (expense?.id && expense.attachments && expense.attachments.length > 0) {
      fetchAttachments();
    } else {
      setAttachments([]);
      setAttachmentError(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expense?.id, expense?.attachments]);

  const handleUploadAttachment = async (file: File) => {
    if (!expense?.id) return;
    setUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/v1/expenses/${expense.id}/attachments`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (response.ok) {
        message.success("Attachment uploaded");
        fetchAttachments();
      } else {
        const err = await response.json();
        message.error(err.detail || "Failed to upload");
      }
    } catch {
      message.error("Upload failed");
    } finally {
      setUploadingAttachment(false);
    }
  };

  return (
    <div style={{ padding: "16px 0" }}>
      {editable && (
        <div style={{ marginBottom: 12 }}>
          <Upload
            beforeUpload={(file) => {
              handleUploadAttachment(file);
              return false;
            }}
            showUploadList={false}
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx"
          >
            <Button icon={<PlusOutlined />} loading={uploadingAttachment}>
              Upload Attachment
            </Button>
          </Upload>
        </div>
      )}
      {attachmentsLoading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin size="default" />
        </div>
      ) : attachmentError ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Button onClick={fetchAttachments} icon={<UndoOutlined />}>
            Could not load attachments — Retry
          </Button>
        </div>
      ) : attachments.length === 0 ? (
        <Empty
          description={
            editable
              ? "No attachments uploaded. Add receipts or supporting documents above."
              : "No attachments uploaded."
          }
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {attachments.map((item) => (
            <div
              key={item.key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: "var(--color-surface)",
                borderRadius: 6,
                border: "1px solid var(--color-border)",
              }}
            >
              <Space>
                {getFileIcon(item.filename)}
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "inherit", fontWeight: 500 }}
                  >
                    {item.filename}
                  </a>
                ) : (
                  <Text>{item.filename}</Text>
                )}
              </Space>
              {item.url && (
                <Button
                  type="text"
                  size="small"
                  icon={<DownloadOutlined />}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
