"use client";

import { useState, useMemo, useRef } from "react";
import {
  ProTable,
  ModalForm,
  ProFormText,
  ProFormDigit,
  type ProColumns,
  type ActionType,
} from "@ant-design/pro-components";
import { Button, App, Popconfirm, Space } from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import type {
  Country,
  CountryCreate,
  City,
  CityCreate,
} from "@/types/location";
import { useCountries, useCities, useInvalidateQueries } from "@/hooks/application/useApi";

export default function LocationsPage() {
  const { message } = App.useApp();
  const { invalidateCountries, invalidateCities } = useInvalidateQueries();
  const actionRef = useRef<ActionType>(null);

  // TanStack Query for tree data
  const { data: countriesData, refetch: refetchCountries } = useCountries();
  const { data: citiesData, refetch: refetchCities } = useCities();

  // Construct tree data
  const treeData = useMemo(() => {
    const countries = (countriesData?.data || []) as Country[];
    const cities = (citiesData?.data || []) as City[];

    const countryMap = new Map<string, Country & { key: string; children: any[] }>();
    countries.forEach((c) => {
      countryMap.set(c.id, { ...c, key: c.id, children: [] });
    });

    cities.forEach((city) => {
      const country = countryMap.get(city.country_id);
      if (country) {
        country.children.push({ ...city, key: city.id });
      }
    });

    const sortedCountries = Array.from(countryMap.values()).sort(
      (a, b) => a.sorting - b.sorting || a.name.localeCompare(b.name)
    );
    sortedCountries.forEach((c) => {
      c.children.sort(
        (a, b) => a.sorting - b.sorting || a.name.localeCompare(b.name)
      );
    });

    return sortedCountries;
  }, [countriesData, citiesData]);

  const handleRefresh = () => {
    refetchCountries();
    refetchCities();
  };

  const handleDelete = async (record: any) => {
    const isCity = "country_id" in record;
    const url = isCity
      ? `/api/v1/cities/${record.id}`
      : `/api/v1/countries/${record.id}`;

    try {
      const response = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      if (response.ok) {
        message.success("Deleted successfully");
        handleRefresh();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to delete");
      }
    } catch {
      message.error("Network error");
    }
  };

  const columns: ProColumns<any>[] = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (_, record) => (
        <div style={{ fontWeight: "country_id" in record ? 500 : 700 }}>
          {record.name}
        </div>
      ),
      fieldProps: { placeholder: "Search name" },
    },
    {
      title: "Code",
      dataIndex: "code",
      key: "code",
      width: 100,
      render: (_, record) => ("code" in record ? record.code || "-" : "-"),
      search: false,
    },
    {
      title: "Order",
      dataIndex: "sorting",
      key: "sorting",
      width: 80,
      align: "center",
      search: false,
    },
    {
      title: "Actions",
      key: "actions",
      width: 200,
      valueType: "option",
      render: (_, record) => {
        const isCountry = !("country_id" in record);
        return (
          <Space size="small">
            {isCountry && (
              <ModalForm<CityCreate>
                title={`Add City to ${record.name}`}
                trigger={
                  <Button size="small" icon={<PlusOutlined />}>
                    City
                  </Button>
                }
                onFinish={async (values) => {
                  try {
                    const response = await fetch("/api/v1/cities", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({
                        ...values,
                        country_id: record.id,
                      }),
                    });
                    if (response.ok) {
                      message.success("City added successfully");
                      handleRefresh();
                      return true;
                    }
                    const error = await response.json();
                    message.error(error.detail || "Failed to create city");
                    return false;
                  } catch {
                    message.error("Network error");
                    return false;
                  }
                }}
                initialValues={{ sorting: 10 }}
              >
                <ProFormText
                  name="name"
                  label="City Name"
                  rules={[{ required: true, message: "Required" }]}
                  placeholder="e.g. Lusaka"
                />
                <ProFormDigit
                  name="sorting"
                  label="Sorting Order"
                  min={0}
                  fieldProps={{ precision: 0 }}
                />
              </ModalForm>
            )}
            <ModalForm
              title={isCountry ? "Edit Country" : "Edit City"}
              trigger={
                <Button type="text" size="small" icon={<EditOutlined />} />
              }
              onFinish={async (values) => {
                const url = isCountry
                  ? `/api/v1/countries/${record.id}`
                  : `/api/v1/cities/${record.id}`;
                try {
                  const response = await fetch(url, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(values),
                  });
                  if (response.ok) {
                    message.success(
                      `${isCountry ? "Country" : "City"} updated successfully`
                    );
                    handleRefresh();
                    return true;
                  }
                  const error = await response.json();
                  message.error(error.detail || "Failed");
                  return false;
                } catch {
                  message.error("Network error");
                  return false;
                }
              }}
              initialValues={record}
            >
              <ProFormText
                name="name"
                label={isCountry ? "Country Name" : "City Name"}
                rules={[{ required: true, message: "Required" }]}
              />
              {isCountry && (
                <ProFormText
                  name="code"
                  label="ISO Code"
                  placeholder="e.g. ZM"
                  fieldProps={{ maxLength: 2 }}
                />
              )}
              <ProFormDigit
                name="sorting"
                label="Sorting Order"
                min={0}
                fieldProps={{ precision: 0 }}
              />
            </ModalForm>
            <Popconfirm
              title={`Delete ${record.name}?`}
              onConfirm={() => handleDelete(record)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <ProTable
      headerTitle="Locations (Country & City)"
      actionRef={actionRef}
      columns={columns}
      rowKey="key"
      dataSource={treeData}
      search={false}
      pagination={false}
      expandable={{
        defaultExpandAllRows: false,
      }}
      toolBarRender={() => [
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
        >
          Refresh
        </Button>,
        <ModalForm<CountryCreate>
          key="create"
          title="Add Country"
          trigger={
            <Button type="primary" icon={<PlusOutlined />}>
              Add Country
            </Button>
          }
          onFinish={async (values) => {
            try {
              const response = await fetch("/api/v1/countries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(values),
              });
              if (response.ok) {
                message.success("Country added successfully");
                handleRefresh();
                return true;
              }
              const error = await response.json();
              message.error(error.detail || "Failed to create country");
              return false;
            } catch {
              message.error("Network error");
              return false;
            }
          }}
          initialValues={{ sorting: 10 }}
        >
          <ProFormText
            name="name"
            label="Country Name"
            rules={[{ required: true, message: "Required" }]}
            placeholder="e.g. Zambia"
          />
          <ProFormText
            name="code"
            label="ISO Code"
            placeholder="e.g. ZM"
            fieldProps={{ maxLength: 2 }}
          />
          <ProFormDigit
            name="sorting"
            label="Sorting Order"
            min={0}
            fieldProps={{ precision: 0 }}
          />
        </ModalForm>,
      ]}
    />
  );
}
