// src/pages/admin/AdminUsersPage.tsx
import { useState, useEffect, useCallback } from "react";
import {
  Table,
  Typography,
  Tag,
  Space,
  Input,
  Select,
  Button,
  Card,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { SearchOutlined } from "@ant-design/icons";
import { adminApi } from "@/api/admin.api";
import type { User, Role } from "@/types";
import { AxiosError } from "axios";
import type { ApiError } from "@/types";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | undefined>();

  const fetchUsers = useCallback(
    async (currentPage = 1) => {
      setLoading(true);
      try {
        const res = await adminApi.getUsers({
          page: currentPage,
          limit: 15,
          search: search || undefined,
          role: roleFilter,
        });
        setUsers(res.data.data);
        setTotal(res.data.meta.total);
      } finally {
        setLoading(false);
      }
    },
    [search, roleFilter],
  );

  useEffect(() => {
    fetchUsers(page);
  }, [page]);

  const handleRoleChange = async (userId: string, newRole: Role) => {
    try {
      await adminApi.updateUserRole(userId, newRole);
      message.success("Роль обновлена");
      fetchUsers(page);
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      message.error(error.response?.data?.message || "Ошибка");
    }
  };

  const columns: ColumnsType<User & { _count?: { bookings: number } }> = [
    {
      title: "Сотрудник",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{r.name}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            {r.email}
          </Typography.Text>
        </Space>
      ),
    },
    { title: "Отдел", dataIndex: "department" },
    {
      title: "Роль",
      dataIndex: "role",
      render: (role: Role, record) => (
        <Select
          value={role}
          size="small"
          style={{ width: 120 }}
          onChange={(newRole) => handleRoleChange(record.id, newRole as Role)}
          options={[
            { value: "EMPLOYEE", label: <Tag color="blue">Сотрудник</Tag> },
            { value: "ADMIN", label: <Tag color="red">Admin</Tag> },
          ]}
        />
      ),
    },
    {
      title: "Броней",
      render: (_, r: any) => r._count?.bookings ?? 0,
    },
  ];

  return (
    <div>
      <Typography.Title level={3} style={{ marginBottom: 16 }}>
        Пользователи
      </Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            size="large"
            placeholder="Поиск по имени или email"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 280 }}
            allowClear
          />
          <Select
            size="large"
            placeholder="Роль"
            allowClear
            style={{ width: 140 }}
            value={roleFilter}
            onChange={setRoleFilter}
            options={[
              { value: "EMPLOYEE", label: "Сотрудник" },
              { value: "ADMIN", label: "Admin" },
            ]}
          />
          <Button size="large" type="primary" onClick={() => fetchUsers(1)}>
            Найти
          </Button>
          <Button
            size="large"
            onClick={() => {
              setSearch("");
              setRoleFilter(undefined);
              fetchUsers(1);
            }}
          >
            Сбросить
          </Button>
        </Space>
      </Card>
      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          total,
          pageSize: 15,
          onChange: setPage,
          showTotal: (t) => `Всего ${t}`,
        }}
      />
    </div>
  );
}
