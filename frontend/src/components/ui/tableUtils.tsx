/**
 * Shared table utilities for Story 2.18: Standardize Tables
 * - getColumnSearchProps: text search filter for dynamic columns
 * - getColumnFilterProps: standard enum filter with search
 * - getStandardRowSelection: standard "No." column definition with checkbox + index
 * - useResizableColumns: hook for resizable column headers
 * - ResizableTitle: component for draggable column borders
 */
import React, { useState, useCallback } from "react";
import { Input, Button, Space } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { Resizable, ResizeCallbackData } from "react-resizable";
import type { ColumnType } from "antd/es/table";
import type { FilterDropdownProps, TableRowSelection } from "antd/es/table/interface";

/**
 * Reusable text search filter for any column.
 * Usage: { ...getColumnSearchProps("route_name") }
 */
export function getColumnSearchProps<T extends Record<string, any>>(
  dataIndex: string
): Partial<ColumnType<T>> {
  return {
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
    }: FilterDropdownProps) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          placeholder={`Search ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={(e) =>
            setSelectedKeys(e.target.value ? [e.target.value] : [])
          }
          onPressEnter={() => confirm()}
          style={{ marginBottom: 8, display: "block" }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => confirm()}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Search
          </Button>
          <Button
            onClick={() => {
              clearFilters?.();
              confirm();
            }}
            size="small"
            style={{ width: 90 }}
          >
            Reset
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? "#1677ff" : undefined }} />
    ),
    onFilter: (value, record) => {
      const cellValue = record[dataIndex];
      if (cellValue == null) return false;
      return String(cellValue)
        .toLowerCase()
        .includes(String(value).toLowerCase());
    },
  };
}

/**
 * Standard Enum Filter with Search
 * Usage: { ...getColumnFilterProps("status", [{ text: 'Active', value: 'active' }]) }
 */
export function getColumnFilterProps<T extends Record<string, any>>(
  dataIndex: string,
  options: { text: React.ReactNode; value: any }[]
): Partial<ColumnType<T>> {
  return {
    filters: options,
    filterSearch: true,
    onFilter: (value, record) => record[dataIndex] === value,
  };
}

/**
 * Standard "No." column that shows Checkbox + Row Index.
 * Header shows Select All checkbox + "No." title.
 * Usage: rowSelection={getStandardRowSelection(page, pageSize, selectedKeys, onChange)}
 */
export function getStandardRowSelection<T>(
  currentPage: number,
  pageSize: number,
  selectedRowKeys: React.Key[],
  onChange: (selectedRowKeys: React.Key[], selectedRows: T[]) => void
): TableRowSelection<T> {
  return {
    columnTitle: (checkboxNode: React.ReactNode) => (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {checkboxNode}
        <span>No.</span>
      </div>
    ),
    columnWidth: 80,
    fixed: true,
    selectedRowKeys,
    onChange,
    renderCell: (checked, record, index, originNode) => (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {originNode}
        <span>{(currentPage - 1) * pageSize + index + 1}</span>
      </div>
    ),
  };
}

/**
 * ResizableTitle component for draggable column borders.
 * Used internally by useResizableColumns hook.
 */
interface ResizableTitleProps extends React.HTMLAttributes<HTMLTableCellElement> {
  onResize?: (e: React.SyntheticEvent, data: ResizeCallbackData) => void;
  width?: number;
}

export const ResizableTitle: React.FC<ResizableTitleProps> = (props) => {
  const { onResize, width, ...restProps } = props;

  // If no onResize handler, render normal th (e.g., for selection column)
  if (!onResize) {
    return <th {...restProps} />;
  }

  // Default width if not specified
  const columnWidth = width || 150;

  return (
    <Resizable
      width={columnWidth}
      height={0}
      handle={
        <span
          className="react-resizable-handle"
          onClick={(e) => e.stopPropagation()}
        />
      }
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th {...restProps} style={{ ...restProps.style, width: columnWidth }} />
    </Resizable>
  );
};

/**
 * Hook to make table columns resizable.
 * Usage:
 *   const { resizableColumns, components } = useResizableColumns(columns);
 *   <Table columns={resizableColumns} components={components} ... />
 */
export function useResizableColumns<T>(
  initialColumns: ColumnType<T>[]
): {
  resizableColumns: ColumnType<T>[];
  components: { header: { cell: React.FC<ResizableTitleProps> } };
} {
  // Store column widths separately to avoid infinite loops
  const [columnWidths, setColumnWidths] = useState<Record<number, number>>({});

  const handleResize = useCallback(
    (index: number) =>
      (_: React.SyntheticEvent, { size }: ResizeCallbackData) => {
        setColumnWidths((prev) => ({
          ...prev,
          [index]: size.width,
        }));
      },
    []
  );

  // Merge initial columns with stored widths (default width of 150 for columns without width)
  const resizableColumns = initialColumns.map((col, index) => {
    const currentWidth = columnWidths[index] ?? col.width ?? 150;
    return {
      ...col,
      width: currentWidth,
      onHeaderCell: () =>
        ({
          width: currentWidth,
          onResize: handleResize(index),
        }) as React.HTMLAttributes<HTMLTableCellElement>,
    };
  });

  const components = {
    header: {
      cell: ResizableTitle,
    },
  };

  return { resizableColumns, components };
}
