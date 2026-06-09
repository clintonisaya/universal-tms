"use client";

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type FilterFn,
} from "@tanstack/react-table";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface DataTableProps<TData> {
  /** Column definitions */
  columns: ColumnDef<TData, any>[];
  /** Data array */
  data: TData[];
  /** Additional Tailwind classes for the table wrapper */
  className?: string;
  /** Enable sorting */
  enableSorting?: boolean;
  /** Enable filtering */
  enableFiltering?: boolean;
  /** Enable pagination */
  enablePagination?: boolean;
  /** Page size for pagination */
  pageSize?: number;
  /** Custom row class name function */
  getRowClassName?: (row: TData) => string;
  /** On row click handler */
  onRowClick?: (row: TData) => void;
}

/**
 * Reusable DataTable component wrapping @tanstack/react-table.
 * Styled with Tailwind for consistency with the app's design system.
 */
export function DataTable<TData>({
  columns,
  data,
  className,
  enableSorting = false,
  enableFiltering = false,
  enablePagination = false,
  pageSize = 10,
  getRowClassName,
  onRowClick,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  return (
    <div className={cn("w-full overflow-auto", className)}>
      <table className="w-full border-collapse">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider",
                    "text-[var(--color-text-muted)] border-b border-[var(--color-border)]",
                    "bg-[var(--color-card)]",
                    enableSorting && header.column.getCanSort() && "cursor-pointer select-none"
                  )}
                  onClick={enableSorting ? header.column.getToggleSortingHandler() : undefined}
                >
                  <div className="flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {enableSorting && header.column.getIsSorted() && (
                      <span className="text-[var(--color-primary)]">
                        {header.column.getIsSorted() === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className={cn(
                "border-b border-[var(--color-border)] transition-colors",
                "hover:bg-[var(--color-table-hover)]",
                onRowClick && "cursor-pointer",
                getRowClassName?.(row.original)
              )}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="px-4 py-3 text-sm text-[var(--color-text-primary)]"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {enablePagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)]">
          <div className="text-sm text-[var(--color-text-secondary)]">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{" "}
            of {table.getFilteredRowModel().rows.length} results
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 text-sm rounded border border-[var(--color-border)] disabled:opacity-50"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </button>
            <button
              className="px-3 py-1 text-sm rounded border border-[var(--color-border)] disabled:opacity-50"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
