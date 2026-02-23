"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Button,
  Card,
  Space,
  Modal,
  Form,
  Input,
  message,
  Typography,
  Popconfirm,
  InputNumber,
  Tag,
  Flex,
} from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type {
  Country,
  CountryCreate,
  City,
  CityCreate,
} from "@/types/location";
import { useAuth } from "@/contexts/AuthContext";
import { useCountries, useCities, useInvalidateQueries } from "@/hooks/useApi";
import {
  getColumnSearchProps,
  getStandardRowSelection,
  useResizableColumns,
} from "@/components/ui/tableUtils";

const { Title } = Typography;

export default function LocationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  // TanStack Query for locations data
  const { data: countriesData, isLoading: countriesLoading, refetch: refetchCountries } = useCountries();
  const { data: citiesData, isLoading: citiesLoading, refetch: refetchCities } = useCities();
  const { invalidateCountries, invalidateCities } = useInvalidateQueries();

  const loading = countriesLoading || citiesLoading;

  // Construct Tree Data
  const data = useMemo(() => {
    const countries = (countriesData?.data || []) as Country[];
    const cities = (citiesData?.data || []) as City[];

    const countryMap = new Map<string, Country>();
    
    // Deep copy to avoid mutating cache
    countries.forEach((c) => {
      countryMap.set(c.id, { ...c, key: c.id, children: [] });
    });

    cities.forEach((city) => {
      const country = countryMap.get(city.country_id);
      if (country && country.children) {
        country.children.push({ ...city, key: city.id });
      }
    });

    // Sort
    const sortedCountries = Array.from(countryMap.values()).sort(
      (a, b) => a.sorting - b.sorting || a.name.localeCompare(b.name)
    );
    
    sortedCountries.forEach((c) => {
      if (c.children) {
        c.children.sort(
          (a, b) => a.sorting - b.sorting || a.name.localeCompare(b.name)
        );
      }
    });

    return sortedCountries;
  }, [countriesData, citiesData]);

  // Modals
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  
  // State for Create/Edit
  const [editingItem, setEditingItem] = useState<Country | City | null>(null);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [selectedCountryName, setSelectedCountryName] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const [countryForm] = Form.useForm();
  const [cityForm] = Form.useForm();

  // Country Handlers
  const handleCountrySubmit = async (values: CountryCreate) => {
    setSubmitting(true);
    try {
      const url = editingItem
        ? `/api/v1/countries/${editingItem.id}`
        : "/api/v1/countries";
      const method = editingItem ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success(`Country ${editingItem ? "updated" : "added"} successfully`);
        setIsCountryModalOpen(false);
        countryForm.resetFields();
        setEditingItem(null);
        invalidateCountries();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed");
      }
    } catch {
      message.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  // City Handlers
  const handleCitySubmit = async (values: CityCreate) => {
    setSubmitting(true);
    try {
      const url = editingItem
        ? `/api/v1/cities/${editingItem.id}`
        : "/api/v1/cities";
      const method = editingItem ? "PATCH" : "POST";

      const payload = { ...values };
      if (!editingItem && selectedCountryId) {
        payload.country_id = selectedCountryId;
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        message.success(`City ${editingItem ? "updated" : "added"} successfully`);
        setIsCityModalOpen(false);
        cityForm.resetFields();
        setEditingItem(null);
        invalidateCities();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed");
      }
    } catch {
      message.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record: Country | City) => {
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
        if (isCity) invalidateCities();
        else invalidateCountries();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to delete");
      }
    } catch {
      message.error("Network error");
    }
  };

  const handleRefresh = () => {
    refetchCountries();
    refetchCities();
  };

  const columns: ColumnsType<any> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text: string) => (
        <div style={{ fontWeight: 600 }}>{text}</div>
      ),
      ...getColumnSearchProps("name"),
    },
    {
      title: "Code",
      dataIndex: "code",
      key: "code",
      width: 100,
      render: (text) => text || "-",
      ...getColumnSearchProps("code"),
    },
    {
      title: "Order",
      dataIndex: "sorting",
      key: "sorting",
      width: 80,
      align: "center",
    },
    {
      title: "Actions",
      key: "actions",
      width: 180,
      fixed: "right",
      render: (_, record) => {
        const isCountry = !("country_id" in record);
        return (
          <div className="row-actions">
            <Space size="small">
              {isCountry && (
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingItem(null);
                    setSelectedCountryId(record.id);
                    setSelectedCountryName(record.name);
                    cityForm.resetFields();
                    setIsCityModalOpen(true);
                  }}
                >
                  City
                </Button>
              )}
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                aria-label="Edit Location"
                onClick={() => {
                  setEditingItem(record);
                  if (isCountry) {
                    countryForm.setFieldsValue(record);
                    setIsCountryModalOpen(true);
                  } else {
                    cityForm.setFieldsValue(record);
                    setIsCityModalOpen(true);
                  }
                }}
              />
              <Popconfirm
                title={`Delete ${record.name}?`}
                onConfirm={() => handleDelete(record)}
                okText="Yes"
                cancelText="No"
                okButtonProps={{ danger: true }}
              >
                <Button type="text" danger size="small" icon={<DeleteOutlined />} aria-label="Delete Location" />
              </Popconfirm>
            </Space>
          </div>
        );
      },
    },
  ];

  // Make columns resizable
  const { resizableColumns, components } = useResizableColumns(columns);

  return (
    <div>
      <Card>
        <Flex vertical gap="middle" style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => router.push("/dashboard")}
              >
                Back
              </Button>
              <Title level={2} style={{ margin: 0 }}>
                Locations (Country &amp; City)
              </Title>
            </Space>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingItem(null);
                  countryForm.resetFields();
                  setIsCountryModalOpen(true);
                }}
              >
                Add Country
              </Button>
            </Space>
          </div>

          <Table
            columns={resizableColumns}
            components={components}
            dataSource={data}
            rowKey="id"
            loading={loading}
            sticky={{ offsetHeader: 64 }}
            pagination={false}
            rowSelection={getStandardRowSelection(
              1,
              data.length || 1000,
              selectedRowKeys,
              setSelectedRowKeys
            )}
          />
        </Flex>
      </Card>

      {/* Country Modal */}
      <Modal
        title={editingItem ? "Edit Country" : "Add Country"}
        open={isCountryModalOpen}
        onCancel={() => {
          setIsCountryModalOpen(false);
          setEditingItem(null);
          countryForm.resetFields();
        }}
        footer={null}
        forceRender
      >
        <Form
          form={countryForm}
          layout="vertical"
          onFinish={handleCountrySubmit}
          initialValues={{ sorting: 10 }}
        >
          <Form.Item
            name="name"
            label="Country Name"
            rules={[{ required: true, message: "Required" }]}
          >
            <Input placeholder="e.g. Zambia" />
          </Form.Item>
          <Form.Item name="code" label="ISO Code">
            <Input placeholder="e.g. ZM" maxLength={2} />
          </Form.Item>
          <Form.Item name="sorting" label="Sorting Order">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setIsCountryModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingItem ? "Save" : "Create"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* City Modal */}
      <Modal
        title={
          editingItem
            ? "Edit City"
            : `Add City to ${selectedCountryName}`
        }
        open={isCityModalOpen}
        onCancel={() => {
          setIsCityModalOpen(false);
          setEditingItem(null);
          cityForm.resetFields();
        }}
        footer={null}
        forceRender
      >
        <Form
          form={cityForm}
          layout="vertical"
          onFinish={handleCitySubmit}
          initialValues={{ sorting: 10 }}
        >
          <Form.Item
            name="name"
            label="City Name"
            rules={[{ required: true, message: "Required" }]}
          >
            <Input placeholder="e.g. Lusaka" />
          </Form.Item>
          <Form.Item name="sorting" label="Sorting Order">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setIsCityModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingItem ? "Save" : "Create"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}