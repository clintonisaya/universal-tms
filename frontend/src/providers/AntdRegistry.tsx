"use client";

import { AntdRegistry as AntdRegistryBase } from "@ant-design/nextjs-registry";
import { ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";
import { ProConfigProvider, enUSIntl } from "@ant-design/pro-components";

export function AntdRegistry({ children }: { children: React.ReactNode }) {
  return (
    <AntdRegistryBase>
      <ConfigProvider locale={enUS}>
        <ProConfigProvider intl={enUSIntl}>{children}</ProConfigProvider>
      </ConfigProvider>
    </AntdRegistryBase>
  );
}
