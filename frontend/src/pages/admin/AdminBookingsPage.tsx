// src/pages/admin/AdminBookingsPage.tsx
import { useState, useEffect, useCallback } from "react";
import {
  Table,
  Typography,
  Tag,
  Space,
  Select,
  DatePicker,
  Button,
  Card,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { adminApi } from "@/api/admin.api";
import { bookingsApi } from "@/api/bookings.api";
import type { Booking, BookingStatus } from "@/types";
import { AxiosError } from "axios";
import type { ApiError } from "@/types";

const { RangePicker } = DatePicker;

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(
    null,
  );

  const fetchBookings = useCallback(
    async (currentPage = 1) => {
      setLoading(true);
      try {
        const res = await adminApi.getAllBookings({
          page: currentPage,
          limit: 15,
          status: statusFilter,
          dateFrom: dateRange?.[0].startOf("day").toISOString(),
          dateTo: dateRange?.[1].endOf("day").toISOString(),
        });
        setBookings(res.data.data);
        setTotal(res.data.meta.total);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, dateRange],
  );

  useEffect(() => {
    fetchBookings(page);
  }, [page]);

  const handleCancel = async (id: string) => {
    try {
      await bookingsApi.cancel(id);
      message.success("Бронь отменена");
      fetchBookings(page);
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      message.error(error.response?.data?.message || "Ошибка");
    }
  };

  const columns: ColumnsType<Booking> = [
    {
      title: "Сотрудник",
      render: (_, r) => (
        <Space orientation="vertical" size={0}>
          <Typography.Text strong>{r.user?.name}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            {r.user?.email}
          </Typography.Text>
        </Space>
      ),
    },
    { title: "Помещение", render: (_, r) => r.room?.name },
    {
      title: "Начало",
      dataIndex: "startTime",
      render: (t: string) => dayjs(t).format("DD.MM.YYYY HH:mm"),
    },
    {
      title: "Конец",
      dataIndex: "endTime",
      render: (t: string) => dayjs(t).format("HH:mm"),
    },
    {
      title: "Статус",
      dataIndex: "status",
      render: (s: BookingStatus) => (
        <Tag color={s === "CONFIRMED" ? "green" : "red"}>
          {s === "CONFIRMED" ? "Активна" : "Отменена"}
        </Tag>
      ),
    },
    {
      title: "Действия",
      render: (_, r) =>
        r.status === "CONFIRMED" ? (
          <Button size="small" danger onClick={() => handleCancel(r.id)}>
            Отменить
          </Button>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3} style={{ marginBottom: 16 }}>
        Все брони
      </Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            size="large"
            placeholder="Статус"
            allowClear
            style={{ width: 160 }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "CONFIRMED", label: "Активные" },
              { value: "CANCELLED", label: "Отменённые" },
            ]}
          />
          <RangePicker
            size="large"
            format="DD.MM.YYYY"
            value={dateRange}
            onChange={(d) =>
              setDateRange(d as [dayjs.Dayjs, dayjs.Dayjs] | null)
            }
          />
          <Button size="large" type="primary" onClick={() => fetchBookings(1)}>
            Применить
          </Button>
          <Button
            size="large"
            onClick={() => {
              setStatusFilter(undefined);
              setDateRange(null);
              fetchBookings(1);
            }}
          >
            Сбросить
          </Button>
        </Space>
      </Card>
      <Table
        columns={columns}
        dataSource={bookings}
        rowKey="id"
        loading={loading}
        pagination={{ current: page, total, pageSize: 15, onChange: setPage }}
      />
    </div>
  );
}
