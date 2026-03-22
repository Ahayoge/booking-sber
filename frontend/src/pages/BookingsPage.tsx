// src/pages/BookingsPage.tsx
import { useState, useEffect, useCallback } from "react";
import {
  Table,
  Typography,
  Tag,
  Button,
  Space,
  Select,
  DatePicker,
  Popconfirm,
  Empty,
  message,
  Card,
  ConfigProvider,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import ruRU from "antd/locale/ru_RU";
import { bookingsApi } from "@/api/bookings.api";
import type { Booking, BookingStatus } from "@/types";
import { AxiosError } from "axios";
import type { ApiError } from "@/types";

const { RangePicker } = DatePicker;

const STATUS_COLORS: Record<BookingStatus, string> = {
  CONFIRMED: "green",
  CANCELLED: "red",
};

const STATUS_LABELS: Record<BookingStatus, string> = {
  CONFIRMED: "Активна",
  CANCELLED: "Отменена",
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<BookingStatus | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(
    null,
  );
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchBookings = useCallback(
    async (currentPage = 1) => {
      setLoading(true);
      try {
        const res = await bookingsApi.getAll({
          page: currentPage,
          limit: 10,
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

  const handleCancel = async (bookingId: string) => {
    setCancellingId(bookingId);
    try {
      await bookingsApi.cancel(bookingId);
      message.success("Бронь успешно отменена");
      fetchBookings(page);
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      message.error(error.response?.data?.message || "Ошибка при отмене");
    } finally {
      setCancellingId(null);
    }
  };

  // Проверяем можно ли отменить бронь (за 1 час до начала)
  const canCancel = (booking: Booking): boolean => {
    if (booking.status === "CANCELLED") return false;
    const minutesUntilStart = dayjs(booking.startTime).diff(dayjs(), "minute");
    return minutesUntilStart >= 60;
  };

  const columns: ColumnsType<Booking> = [
    {
      title: "Помещение",
      dataIndex: ["room", "name"],
      render: (name: string, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{name}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.room?.address}, эт. {record.room?.floor}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Начало",
      dataIndex: "startTime",
      render: (t: string) => (
        <Space direction="vertical" size={0}>
          <span>{dayjs(t).format("DD.MM.YYYY")}</span>
          <Typography.Text type="secondary">
            {dayjs(t).format("HH:mm")}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Конец",
      dataIndex: "endTime",
      render: (t: string) => dayjs(t).format("HH:mm"),
    },
    {
      title: "Длительность",
      render: (_, record) => {
        const mins = dayjs(record.endTime).diff(
          dayjs(record.startTime),
          "minute",
        );
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return h > 0 ? `${h}ч ${m > 0 ? m + "м" : ""}` : `${m}м`;
      },
    },
    {
      title: "Статус",
      dataIndex: "status",
      render: (status: BookingStatus) => (
        <Tag color={STATUS_COLORS[status]}>{STATUS_LABELS[status]}</Tag>
      ),
    },
    {
      title: "Действия",
      render: (_, record) =>
        canCancel(record) ? (
          <Popconfirm
            title="Отменить бронь?"
            description="Это действие нельзя отменить."
            okText="Да, отменить"
            cancelText="Нет"
            onConfirm={() => handleCancel(record.id)}
          >
            <Button danger size="small" loading={cancellingId === record.id}>
              Отменить
            </Button>
          </Popconfirm>
        ) : (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.status === "CANCELLED" ? "—" : "Менее 1 часа до начала"}
          </Typography.Text>
        ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3} style={{ marginBottom: 16 }}>
        Мои брони
      </Typography.Title>

      {/* ─── Фильтры ───────────────────────────────────────────────────── */}
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
          <ConfigProvider locale={ruRU}>
            <RangePicker
              size="large"
              format="DD.MM.YYYY"
              placeholder={["Дата от", "Дата до"]}
              value={dateRange}
              onChange={(d) =>
                setDateRange(d as [dayjs.Dayjs, dayjs.Dayjs] | null)
              }
            />
          </ConfigProvider>
          <Button type="primary" size="large" onClick={() => fetchBookings(1)}>
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
        locale={{ emptyText: <Empty description="Нет броней" /> }}
        pagination={{
          current: page,
          total,
          pageSize: 10,
          onChange: setPage,
          showTotal: (t) => `Всего ${t}`,
        }}
      />
    </div>
  );
}
