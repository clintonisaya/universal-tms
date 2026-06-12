"use client";

import { AntdRegistry as AntdRegistryBase } from "@ant-design/nextjs-registry";
import { ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";

export function AntdRegistry({ children }: { children: React.ReactNode }) {
  return (
    <AntdRegistryBase>
      <ConfigProvider locale={enUS}>{children}</ConfigProvider>
    </AntdRegistryBase>
  );
}
