// src/pages/owner/tabs/OwnerBookingsTab.tsx
import { useState, useEffect, useCallback } from "react";
import {
  Table,
  Typography,
  Tag,
  Button,
  Space,
  Popconfirm,
  message,
  Card,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { roomOwnerApi } from "@/api/room-owner.api";
import type { Booking, BookingStatus } from "@/types";

interface Props {
  roomId: string;
}

export default function OwnerBookingsTab({ roomId }: Props) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const fetchBookings = useCallback(
    async (currentPage = 1) => {
      setLoading(true);
      try {
        const res = await roomOwnerApi.getRoomBookings(roomId, {
          page: currentPage,
          limit: 15,
        });
        setBookings(res.data.data);
        setTotal(res.data.meta.total);
      } finally {
        setLoading(false);
      }
    },
    [roomId],
  );

  useEffect(() => {
    fetchBookings(page);
  }, [page]);

  const handleCancel = async (bookingId: string) => {
    try {
      await roomOwnerApi.cancelBooking(roomId, bookingId);
      message.success("Бронь отменена, пользователь уведомлён");
      fetchBookings(page);
    } catch (err: any) {
      message.error(err.response?.data?.message || "Ошибка");
    }
  };

  const columns: ColumnsType<Booking> = [
    {
      title: "Сотрудник",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{r.user?.name}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            {r.user?.department}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Время",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <span>{dayjs(r.startTime).format("DD.MM.YYYY")}</span>
          <Typography.Text type="secondary">
            {dayjs(r.startTime).format("HH:mm")} –{" "}
            {dayjs(r.endTime).format("HH:mm")}
          </Typography.Text>
        </Space>
      ),
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
        r.status === "CONFIRMED" && dayjs(r.startTime).isAfter(dayjs()) ? (
          <Popconfirm
            title="Отменить бронь?"
            description="Пользователь получит уведомление."
            okText="Отменить"
            cancelText="Нет"
            onConfirm={() => handleCancel(r.id)}
          >
            <Button size="small" danger>
              Отменить
            </Button>
          </Popconfirm>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <Card title="Брони помещения">
      <Table
        columns={columns}
        dataSource={bookings}
        rowKey="id"
        loading={loading}
        pagination={{ current: page, total, pageSize: 15, onChange: setPage }}
        locale={{ emptyText: "Нет броней" }}
      />
    </Card>
  );
}
