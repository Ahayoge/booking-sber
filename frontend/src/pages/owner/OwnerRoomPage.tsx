// src/pages/owner/OwnerRoomPage.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { Tabs, Typography, Spin, Alert, Button, Space } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { roomsApi } from "@/api/rooms.api";
import type { Room } from "@/types";
import OwnerScheduleTab from "@/pages/owner/tabs/OwnerScheduleTab";
import OwnerBlockedSlotsTab from "@/pages/owner/tabs/OwnerBlockedSlotsTab";
import OwnerBookingsTab from "@/pages/owner/tabs/OwnerBookingsTab";
import OwnerAnalyticsTab from "@/pages/owner/tabs/OwnerAnalyticsTab";

export default function OwnerRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    roomsApi
      .getOne(roomId)
      .then((res) => setRoom(res.data))
      .finally(() => setLoading(false));
  }, [roomId]);

  if (loading) return <Spin style={{ display: "block", marginTop: 80 }} />;
  if (!room) return <Alert type="error" message="Помещение не найдено" />;

  const tabs = [
    {
      key: "schedule",
      label: "📅 Расписание",
      children: <OwnerScheduleTab roomId={room.id} />,
    },
    {
      key: "blocked",
      label: "🔒 Блокировки",
      children: <OwnerBlockedSlotsTab roomId={room.id} />,
    },
    {
      key: "bookings",
      label: "📋 Брони",
      children: <OwnerBookingsTab roomId={room.id} />,
    },
    {
      key: "analytics",
      label: "📊 Аналитика",
      children: <OwnerAnalyticsTab roomId={room.id} />,
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/rooms")}>
          Назад
        </Button>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Управление: {room.name}
        </Typography.Title>
      </Space>

      <Tabs items={tabs} defaultActiveKey="schedule" />
    </div>
  );
}
