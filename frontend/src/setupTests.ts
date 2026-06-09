import "@testing-library/jest-dom";
import { vi } from "vitest";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
}

global.IntersectionObserver =
  MockIntersectionObserver as unknown as typeof IntersectionObserver;

window.scrollTo = vi.fn();

Object.defineProperty(URL, "createObjectURL", {
  writable: true,
  value: vi.fn(() => "blob:test-object-url"),
});

Object.defineProperty(URL, "revokeObjectURL", {
  writable: true,
  value: vi.fn(),
});

vi.mock("@ant-design/pro-components", async () => {
  const React = await import("react");
  const h = React.createElement;

  type Row = Record<string, unknown>;
  type Column = {
    title?: unknown;
    dataIndex?: string | string[];
    key?: string;
    render?: (value: unknown, record: Row, index: number) => unknown;
  };

  function renderNode(node: unknown): React.ReactNode {
    if (node == null || typeof node === "boolean") return null;
    if (React.isValidElement(node)) return node;
    if (Array.isArray(node)) {
      return node.map((child, index) =>
        h(React.Fragment, { key: index }, renderNode(child)),
      );
    }
    if (typeof node === "object") return JSON.stringify(node);
    return String(node);
  }

  function getValue(record: Row, dataIndex: Column["dataIndex"]) {
    if (!dataIndex) return undefined;
    if (Array.isArray(dataIndex)) {
      return dataIndex.reduce<unknown>((value, key) => {
        if (value && typeof value === "object") {
          return (value as Row)[key];
        }
        return undefined;
      }, record);
    }
    return record[dataIndex];
  }

  function flattenRows(rows: Row[]): Row[] {
    return rows.flatMap((row) => {
      const children = Array.isArray(row.children)
        ? flattenRows(row.children as Row[])
        : [];
      return [row, ...children];
    });
  }

  function ProTable(props: {
    headerTitle?: unknown;
    columns?: Column[];
    dataSource?: Row[];
    request?: (params: Row) => Promise<{ data?: Row[] }>;
    params?: Row;
    toolBarRender?: () => React.ReactNode[];
  }) {
    const [requestedData, setRequestedData] = React.useState<Row[]>([]);

    React.useEffect(() => {
      let active = true;
      if (!props.request) return;

      void props
        .request({
          current: 1,
          pageSize: 20,
          ...(props.params || {}),
        })
        .then((result) => {
          if (active) setRequestedData(result.data || []);
        });

      return () => {
        active = false;
      };
    }, []);

    const columns = props.columns || [];
    const rows = flattenRows(props.request ? requestedData : props.dataSource || []);
    const toolbar =
      typeof props.toolBarRender === "function" ? props.toolBarRender() : [];

    return h(
      "div",
      { "data-testid": "pro-table" },
      props.headerTitle ? h("h2", null, renderNode(props.headerTitle)) : null,
      toolbar.length ? h("div", null, renderNode(toolbar)) : null,
      h(
        "table",
        null,
        h(
          "thead",
          null,
          h(
            "tr",
            null,
            columns.map((column, index) =>
              h("th", { key: column.key || String(index) }, renderNode(column.title)),
            ),
          ),
        ),
        h(
          "tbody",
          null,
          rows.map((record, rowIndex) =>
            h(
              "tr",
              { key: String(record.id || record.key || rowIndex) },
              columns.map((column, columnIndex) => {
                const value = getValue(record, column.dataIndex);
                const rendered = column.render
                  ? column.render(value, record, rowIndex)
                  : value;
                return h(
                  "td",
                  { key: column.key || column.dataIndex?.toString() || columnIndex },
                  renderNode(rendered),
                );
              }),
            ),
          ),
        ),
      ),
    );
  }

  function ProCard(props: {
    title?: unknown;
    loading?: boolean;
    children?: React.ReactNode;
  }) {
    return h(
      "section",
      null,
      props.title ? h("h3", null, renderNode(props.title)) : null,
      props.loading ? h("div", null, "Loading...") : props.children,
    );
  }

  function ProLayout(props: {
    title?: unknown;
    route?: { routes?: Row[] };
    actionsRender?: () => React.ReactNode[];
    children?: React.ReactNode;
  }) {
    const renderRoutes = (routes: Row[] = []): React.ReactNode =>
      h(
        "ul",
        null,
        routes.map((route, index) =>
          h(
            "li",
            { key: String(route.path || route.name || index) },
            renderNode(route.name),
            Array.isArray(route.children)
              ? renderRoutes(route.children as Row[])
              : null,
          ),
        ),
      );

    return h(
      "div",
      { "data-testid": "pro-layout" },
      props.title ? h("h1", null, renderNode(props.title)) : null,
      h("nav", null, renderRoutes(props.route?.routes || [])),
      h("div", null, renderNode(props.actionsRender?.() || [])),
      h("main", null, props.children),
    );
  }

  function ModalForm(props: {
    title?: unknown;
    trigger?: React.ReactNode;
    children?: React.ReactNode;
  }) {
    return h(
      "div",
      null,
      props.trigger,
      h(
        "div",
        null,
        props.title ? h("h3", null, renderNode(props.title)) : null,
        props.children,
      ),
    );
  }

  function ProForm(props: { children?: React.ReactNode }) {
    return h("form", null, props.children);
  }

  function ProFormField(props: {
    label?: unknown;
    name?: string;
    placeholder?: string;
  }) {
    const label = props.label || props.name || props.placeholder;
    return h(
      "label",
      null,
      renderNode(label),
      h("input", {
        name: props.name,
        placeholder: props.placeholder,
        "aria-label": typeof label === "string" ? label : props.name,
      }),
    );
  }

  return {
    ProTable,
    ProCard,
    ProLayout,
    ModalForm,
    ProForm,
    ProFormText: ProFormField,
    ProFormTextArea: ProFormField,
    ProFormSelect: ProFormField,
    ProFormDatePicker: ProFormField,
    ProFormDigit: ProFormField,
    ProFormSwitch: ProFormField,
    LoginForm: ProForm,
    ProConfigProvider: ({ children }: { children?: React.ReactNode }) => children,
    enUSIntl: { locale: "en_US", getMessage: (_id: string, defaultMessage?: string) => defaultMessage || "" },
    SettingDrawer: () => h("aside", null),
  };
});
