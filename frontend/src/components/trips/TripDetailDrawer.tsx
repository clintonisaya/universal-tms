"use client";

import {
  Drawer,
  Button,
  Space,
  Tabs,
  Table,
  Typography,
  Spin,
  Modal,
  Alert,
} from "antd";
import { useAuth } from "@/contexts/AuthContext";
import type { Waybill } from "@/types/waybill";
import { AddExpenseModal } from "@/components/expenses/AddExpenseModal";
import { UpdateTripStatusModal } from "@/components/trips/UpdateTripStatusModal";
import { TripStatusTag } from "@/components/ui/TripStatusTag";
import { useTripDetail } from "@/hooks/useTripDetail";
import { TripInfoPanel } from "./TripInfoPanel";
import { TripExpensesTab } from "./TripExpensesTab";
import { TripWaybillsTab } from "./TripWaybillsTab";
import { TripAttachmentsTab } from "./TripAttachmentsTab";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useState } from "react";

const { Text } = Typography;

interface TripDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  tripId: string | null;
  onEdit?: (tripId: string) => void;
}

export function TripDetailDrawer({ open, onClose, tripId, onEdit }: TripDetailDrawerProps) {
  const { user } = useAuth();
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const d = useTripDetail(tripId, open);

  const showFinancials = user?.role === "admin" || user?.role === "manager" || !!user?.is_superuser;

  return (
    <ErrorBoundary>
      <>
        <Drawer
          title={
            d.trip ? (
              <Space>
                <span>Trip: {d.trip.route_name}</span>
                <TripStatusTag status={d.trip.status} isDelayed={d.trip.is_delayed} />
              </Space>
            ) : "Trip Details"
          }
          open={open}
          onClose={onClose}
          styles={{ wrapper: { width: "min(1500px, 90vw)" } }}
          destroyOnHidden={false}
          extra={
            d.trip && (
              <Space>
                {(d.trip.status === "Offloading" || d.trip.status === "Offloaded") && !d.trip.return_waybill_id && (
                  <Button type="default" onClick={d.handleOpenAttachWaybill}>
                    Attach Return Waybill
                  </Button>
                )}
                {d.trip.status !== "Completed" && d.trip.status !== "Cancelled" && (
                  <Button danger onClick={d.openCancelModal}>Cancel Trip</Button>
                )}
                {d.trip.status !== "Completed" && d.trip.status !== "Cancelled" && (
                  <Button type="primary" ghost onClick={() => onEdit?.(d.trip!.id)}>Edit Trip</Button>
                )}
                <Button type="link" onClick={() => setIsStatusModalOpen(true)}>Update Status</Button>
              </Space>
            )
          }
        >
          {d.loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 50 }}>
              <Spin size="large" />
            </div>
          ) : !d.trip ? (
            <div style={{ textAlign: "center", padding: 50 }}>Trip not found</div>
          ) : (
            <Tabs
              activeKey={d.activeTab}
              onChange={d.setActiveTab}
              items={[
                {
                  key: "details",
                  label: "Details",
                  children: <TripInfoPanel trip={d.trip} onEditRemarks={() => setIsStatusModalOpen(true)} />,
                },
                {
                  key: "financials",
                  label: "Financials",
                  children: (
                    <TripExpensesTab
                      trip={d.trip}
                      expenses={d.expenses}
                      expensesLoading={d.expensesLoading}
                      activeCurrency={d.activeCurrency}
                      toggleCurrencies={d.toggleCurrencies}
                      singleRate={d.singleRate}
                      showFinancials={showFinancials}
                      displayCurrency={d.displayCurrency}
                      onDisplayCurrencyChange={d.setDisplayCurrency}
                      onAddExpense={() => setIsAddExpenseOpen(true)}
                      onRefresh={d.fetchExpenses}
                      onDeleteExpense={d.handleDeleteExpense}
                      convertedTotal={d.convertedTotal}
                      resolveRate={d.resolveRate}
                    />
                  ),
                },
                {
                  key: "border-crossings",
                  label: `Border Crossings${d.borderCrossings.length > 0 ? ` (${d.borderCrossings.length})` : ""}`,
                  children: <TripWaybillsTab borderCrossings={d.borderCrossings} loadingCrossings={d.loadingCrossings} />,
                },
                {
                  key: "attachments",
                  label: `Attachments${d.tripAttachments.length > 0 ? ` (${d.tripAttachments.length})` : ""}`,
                  children: (
                    <TripAttachmentsTab
                      tripStatus={d.trip.status}
                      tripAttachments={d.tripAttachments}
                      attachmentsLoading={d.attachmentsLoading}
                      uploadingAttachment={d.uploadingAttachment}
                      deletingAttachmentKey={d.deletingAttachmentKey}
                      onUpload={d.handleUploadAttachment}
                      onDelete={d.handleDeleteAttachment}
                    />
                  ),
                },
              ]}
            />
          )}
        </Drawer>

        {/* Add Expense Modal */}
        {tripId && (
          <AddExpenseModal
            open={isAddExpenseOpen}
            onClose={() => setIsAddExpenseOpen(false)}
            onSuccess={d.fetchExpenses}
            tripId={tripId}
          />
        )}

        {/* Update Trip Status Modal */}
        {tripId && d.trip && (
          <UpdateTripStatusModal
            open={isStatusModalOpen}
            onClose={() => setIsStatusModalOpen(false)}
            onSuccess={d.fetchTrip}
            tripId={tripId}
            initialValues={{
              status: d.trip.status,
              current_location: d.trip.current_location,
              return_waybill_id: d.trip.return_waybill_id,
            }}
          />
        )}

        {/* Attach Return Waybill Modal */}
        <Modal
          title="Attach Return Waybill"
          open={d.isAttachWaybillOpen}
          onCancel={() => d.setIsAttachWaybillOpen(false)}
          onOk={d.handleAttachReturnWaybill}
          okText="Attach Waybill"
          confirmLoading={d.attachingWaybill}
          okButtonProps={{ disabled: !d.selectedReturnWaybillId }}
          width={860}
        >
          <Space orientation="vertical" style={{ width: "100%" }}>
            <Text type="secondary">
              Select an open waybill to attach as the return leg for this trip.
            </Text>
            {d.loadingWaybills ? (
              <Spin />
            ) : d.openWaybills.length === 0 ? (
              <Text type="secondary">No open waybills available.</Text>
            ) : (
              <Table
                size="small"
                dataSource={d.openWaybills}
                rowKey="id"
                pagination={false}
                scroll={{ x: "max-content", y: 300 }}
                rowSelection={{
                  type: "radio",
                  selectedRowKeys: d.selectedReturnWaybillId ? [d.selectedReturnWaybillId] : [],
                  onChange: (keys) => d.setSelectedReturnWaybillId(keys[0] as string),
                }}
                columns={[
                  { title: "Waybill #", dataIndex: "waybill_number", key: "wbn", width: 130 },
                  { title: "Client", dataIndex: "client_name", key: "client", ellipsis: true },
                  {
                    title: "Route", key: "route",
                    render: (_: unknown, r: Waybill) => `${r.origin} → ${r.destination}`,
                    ellipsis: true,
                  },
                  {
                    title: "Rate", key: "rate", width: 110,
                    render: (_: unknown, r: Waybill) => `${r.currency} ${Number(r.agreed_rate).toLocaleString()}`,
                  },
                ]}
              />
            )}
          </Space>
        </Modal>

        {/* Cancel Trip Modal */}
        <Modal
          title="Cancel Trip"
          open={d.isCancelModalOpen}
          onCancel={() => d.setIsCancelModalOpen(false)}
          onOk={d.handleCancelTrip}
          okText="Confirm Cancel"
          okButtonProps={{ danger: true }}
          confirmLoading={d.cancelling}
        >
          <Space direction="vertical" style={{ width: "100%" }}>
            <Text>Are you sure you want to cancel this trip?</Text>
            {(() => {
              const hasGo = !!d.trip?.waybill_id;
              const hasReturn = !!d.trip?.return_waybill_id;
              const waybillCount = [hasGo, hasReturn].filter(Boolean).length;

              if (waybillCount === 0) return null;
              if (waybillCount === 1) {
                return (
                  <Alert
                    type="warning" showIcon
                    message="Cancelling this trip will also cancel the linked waybill. This cannot be undone."
                  />
                );
              }
              return (
                <>
                  <Text type="secondary">This trip has 2 waybills. Select which to reset to Open:</Text>
                  <Space direction="vertical">
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input type="checkbox" checked={d.cancelGoWaybill} onChange={(e) => d.setCancelGoWaybill(e.target.checked)} />
                      <span>Go Waybill (reset to Open)</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input type="checkbox" checked={d.cancelReturnWaybill} onChange={(e) => d.setCancelReturnWaybill(e.target.checked)} />
                      <span>Return Waybill (reset to Open)</span>
                    </label>
                  </Space>
                </>
              );
            })()}
          </Space>
        </Modal>
      </>
    </ErrorBoundary>
  );
}
