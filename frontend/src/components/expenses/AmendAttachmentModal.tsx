"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  List,
  Button,
  Upload,
  Typography,
  Spin,
  Space,
  message,
} from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import {
  DeleteOutlined,
  UploadOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileUnknownOutlined,
  DownloadOutlined,
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
  if (lower.endsWith(".pdf")) return <FilePdfOutlined style={{ color: "#ff4d4f", fontSize: 18 }} />;
  if (lower.match(/\.(jpe?g|png|gif|webp)$/)) return <FileImageOutlined style={{ color: "#1890ff", fontSize: 18 }} />;
  return <FileUnknownOutlined style={{ fontSize: 18 }} />;
}

interface AmendAttachmentModalProps {
  expense: ExpenseRequestDetailed | null;
  open: boolean;
  onClose: () => void;
}

export function AmendAttachmentModal({ expense, open, onClose }: AmendAttachmentModalProps) {
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open && expense?.id) {
      const fetchAttachments = async () => {
        setLoading(true);
        try {
          const response = await fetch(`/api/v1/expenses/${expense.id}/attachments`, {
            credentials: "include",
          });
          if (response.ok) {
            setAttachments(await response.json());
          } else {
            setAttachments([]);
          }
        } catch {
          setAttachments([]);
        } finally {
          setLoading(false);
        }
      };
      fetchAttachments();
    } else {
      setAttachments([]);
    }
    setFileList([]);
  }, [open, expense?.id]);

  const handleDelete = async (key: string) => {
    if (!expense) return;
    setDeletingKey(key);
    try {
      const response = await fetch(
        `/api/v1/expenses/${expense.id}/attachment?key=${encodeURIComponent(key)}`,
        { method: "DELETE", credentials: "include" }
      );
      if (response.ok) {
        setAttachments((prev) => prev.filter((a) => a.key !== key));
        message.success("Attachment deleted");
      } else {
        message.error("Failed to delete attachment");
      }
    } catch {
      message.error("Network error");
    } finally {
      setDeletingKey(null);
    }
  };

  const handleUpload = async () => {
    if (!expense || fileList.length === 0) return;
    setUploading(true);
    try {
      for (const file of fileList) {
        const fileToUpload = file.originFileObj || (file as any);
        if (fileToUpload) {
          const formData = new FormData();
          formData.append("file", fileToUpload as Blob);
          const response = await fetch(`/api/v1/expenses/${expense.id}/attachment`, {
            method: "POST",
            credentials: "include",
            body: formData,
          });
          if (!response.ok) {
            message.error(`Failed to upload ${file.name}`);
          }
        }
      }
      message.success("Attachments uploaded");
      setFileList([]);
      // Refresh list
      const response = await fetch(`/api/v1/expenses/${expense.id}/attachments`, {
        credentials: "include",
      });
      if (response.ok) setAttachments(await response.json());
    } catch {
      message.error("Network error during upload");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFileList([]);
    onClose();
  };

  return (
    <Modal
      title={`Attachments — ${expense?.expense_number ?? "Expense"}`}
      open={open}
      onCancel={handleClose}
      footer={
        <Space>
          <Button onClick={handleClose}>Close</Button>
          {fileList.length > 0 && (
            <Button type="primary" loading={uploading} onClick={handleUpload}>
              Upload {fileList.length} file{fileList.length > 1 ? "s" : ""}
            </Button>
          )}
        </Space>
      }
      width={560}
      destroyOnHidden
    >
      <Spin spinning={loading}>
        <Text strong style={{ display: "block", marginBottom: 8 }}>
          Existing Attachments
        </Text>
        {attachments.length === 0 && !loading ? (
          <Text type="secondary">No attachments found.</Text>
        ) : (
          <List
            dataSource={attachments}
            renderItem={(att) => (
              <List.Item
                actions={[
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
                  <Button
                    key="delete"
                    type="link"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    loading={deletingKey === att.key}
                    onClick={() => handleDelete(att.key)}
                  />,
                ].filter(Boolean)}
              >
                <Space>
                  {getFileIcon(att.filename)}
                  <Text ellipsis style={{ maxWidth: 300 }}>
                    {att.filename}
                  </Text>
                </Space>
              </List.Item>
            )}
          />
        )}

        <div style={{ marginTop: 16 }}>
          <Text strong style={{ display: "block", marginBottom: 8 }}>
            Add Attachments
          </Text>
          <Upload
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx"
            fileList={fileList}
            beforeUpload={(file) => {
              const maxSize = 3 * 1024 * 1024;
              if (file.size > maxSize) {
                message.error(`${file.name} exceeds the 3 MB limit`);
                return Upload.LIST_IGNORE;
              }
              const allowed = [
                "application/pdf",
                "image/jpeg", "image/png", "image/gif", "image/webp",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/vnd.ms-excel",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              ];
              if (!allowed.includes(file.type)) {
                message.error(`${file.name}: unsupported type. Use PDF, images, Word, or Excel.`);
                return Upload.LIST_IGNORE;
              }
              const f = file as UploadFile;
              f.url = URL.createObjectURL(file);
              setFileList((prev) => [...prev, f]);
              return false;
            }}
            onRemove={(file) => {
              if (file.url?.startsWith("blob:")) URL.revokeObjectURL(file.url);
              setFileList((prev) => prev.filter((f) => f.uid !== file.uid));
            }}
          >
            <Button icon={<UploadOutlined />}>Select File</Button>
          </Upload>
          <Text type="secondary" style={{ display: "block", marginTop: 4, fontSize: 12 }}>
            Accepted: PDF, JPEG, PNG, GIF, WebP, Word (.doc/.docx), Excel (.xls/.xlsx) · Max 3 MB
          </Text>
        </div>
      </Spin>
    </Modal>
  );
}

export default AmendAttachmentModal;
