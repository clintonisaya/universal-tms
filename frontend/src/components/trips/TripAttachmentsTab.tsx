"use client";

import { Space, Button, Table, Upload, Alert, Spin, Typography, Tooltip, message } from "antd";
import type { UploadFile } from "antd";
import { UploadOutlined, PaperClipOutlined, DownloadOutlined, DeleteOutlined } from "@ant-design/icons";

const { Text } = Typography;

interface TripAttachment { key: string; filename: string; url: string; }

interface TripAttachmentsTabProps {
  tripStatus: string;
  tripAttachments: TripAttachment[];
  attachmentsLoading: boolean;
  uploadingAttachment: boolean;
  deletingAttachmentKey: string | null;
  onUpload: (file: UploadFile) => void;
  onDelete: (key: string) => void;
}

export function TripAttachmentsTab({
  tripStatus,
  tripAttachments,
  attachmentsLoading,
  uploadingAttachment,
  deletingAttachmentKey,
  onUpload,
  onDelete,
}: TripAttachmentsTabProps) {
  const isClosed = tripStatus === "Completed" || tripStatus === "Cancelled";

  return (
    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
      {isClosed && (
        <Alert
          type="info" showIcon
          message="Trip Closed"
          description="This trip is closed. Attachments are read-only."
          style={{ marginBottom: 4 }}
        />
      )}

      {!isClosed && (
        <Upload
          accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx"
          beforeUpload={(file) => {
            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
              message.error(`${file.name} exceeds 5 MB limit`);
              return Upload.LIST_IGNORE;
            }
            const allowed = [
              "application/pdf",
              "image/jpeg", "image/png", "image/webp", "image/gif",
              "application/msword",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              "application/vnd.ms-excel",
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ];
            if (!allowed.includes(file.type)) {
              message.error(`${file.name}: unsupported file type. Use PDF, images, Word, or Excel.`);
              return Upload.LIST_IGNORE;
            }
            onUpload(file as any);
            return false;
          }}
          showUploadList={false}
          disabled={uploadingAttachment}
        >
          <Button icon={<UploadOutlined />} loading={uploadingAttachment}>
            Upload Document
          </Button>
        </Upload>
      )}
      {!isClosed && (
        <Text type="secondary" style={{ fontSize: 11 }}>
          Accepted: PDF, JPEG, PNG, WebP, GIF, Word (.doc/.docx), Excel (.xls/.xlsx) · Max 5 MB per file
        </Text>
      )}

      {attachmentsLoading ? (
        <div style={{ textAlign: "center", padding: 24 }}><Spin /></div>
      ) : tripAttachments.length === 0 ? (
        <Text type="secondary">No attachments uploaded yet.</Text>
      ) : (
        <Table
          size="small"
          dataSource={tripAttachments}
          rowKey="key"
          scroll={{ x: "max-content" }}
          pagination={false}
          columns={[
            {
              title: "File", dataIndex: "filename", key: "filename",
              render: (name: string, rec: TripAttachment) => (
                <a href={rec.url} target="_blank" rel="noreferrer">
                  <Space size={4}><PaperClipOutlined />{name}</Space>
                </a>
              ),
            },
            {
              title: "", key: "actions", width: 80, align: "right" as const,
              render: (_: unknown, rec: TripAttachment) => (
                <Space>
                  <Tooltip title="Download">
                    <Button type="text" size="small" icon={<DownloadOutlined />} href={rec.url} target="_blank" />
                  </Tooltip>
                  {!isClosed && (
                    <Tooltip title="Delete">
                      <Button
                        type="text" size="small" danger
                        icon={<DeleteOutlined />}
                        loading={deletingAttachmentKey === rec.key}
                        onClick={() => onDelete(rec.key)}
                      />
                    </Tooltip>
                  )}
                </Space>
              ),
            },
          ]}
        />
      )}
    </Space>
  );
}
