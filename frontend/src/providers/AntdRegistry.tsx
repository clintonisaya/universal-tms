"use client";

import { AntdRegistry as AntdRegistryBase } from "@ant-design/nextjs-registry";

export function AntdRegistry({ children }: { children: React.ReactNode }) {
  return <AntdRegistryBase>{children}</AntdRegistryBase>;
}
