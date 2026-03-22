// src/pages/NotificationsPage.tsx
import { useState, useEffect } from "react";
import {
  List,
  Typography,
  Button,
  Badge,
  Space,
  Empty,
  Spin,
  Card,
  message,
} from "antd";
import {
  BellOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { notificationsApi } from "@/api/notifications.api";
import { useNotificationsStore } from "@/store/notifications.store";
import type { Notification, NotificationType } from "@/types";

import { useThemeStore } from "@/store/theme.store";

// Иконки и цвета для каждого типа уведомления
const NOTIF_CONFIG: Record<
  NotificationType,
  { icon: React.ReactNode; color: string }
> = {
  BOOKING_CONFIRMED: { icon: <CheckOutlined />, color: "#52c41a" },
  BOOKING_CANCELLED: { icon: <CloseCircleOutlined />, color: "#ff4d4f" },
  REMINDER: { icon: <ClockCircleOutlined />, color: "#fa8c16" },
};

export default function NotificationsPage() {
  const { isDark } = useThemeStore();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const { setUnreadCount, clearUnread } = useNotificationsStore();

  const fetchNotifications = async (currentPage = 1) => {
    setLoading(true);
    try {
      const res = await notificationsApi.getAll(currentPage, 20);
      setNotifications(res.data.data);
      setTotal(res.data.meta.total);
      setUnreadCount(res.data.meta.unreadCount ?? 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(page);
  }, [page]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount(
        Math.max(0, notifications.filter((n) => !n.isRead).length - 1),
      );
    } catch {
      message.error("Не удалось отметить уведомление");
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      clearUnread();
      message.success("Все уведомления прочитаны");
    } catch {
      message.error("Ошибка");
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div>
      <Space
        style={{
          marginBottom: 16,
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <Space>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Уведомления
          </Typography.Title>
          {unreadCount > 0 && (
            <Badge count={unreadCount} style={{ backgroundColor: "#21A038" }} />
          )}
        </Space>
        {unreadCount > 0 && (
          <Button
            icon={<CheckOutlined />}
            onClick={handleMarkAllAsRead}
            loading={markingAll}
          >
            Прочитать все
          </Button>
        )}
      </Space>

      <Card>
        <Spin spinning={loading}>
          {notifications.length === 0 && !loading ? (
            <Empty
              image={
                <BellOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />
              }
              description="Нет уведомлений"
            />
          ) : (
            <List
              dataSource={notifications}
              pagination={{
                current: page,
                total,
                pageSize: 20,
                onChange: setPage,
                simple: true,
              }}
              renderItem={(notif) => {
                const config = NOTIF_CONFIG[notif.type];
                return (
                  <List.Item
                    style={{
                      // ✅ В тёмной теме — тёмно-зелёный фон, в светлой — светло-зелёный
                      background: notif.isRead
                        ? "transparent"
                        : isDark
                          ? "#0d2b12" // тёмно-зелёный — хорошо контрастирует с белым текстом
                          : "#f6ffed", // светло-зелёный — хорошо контрастирует с тёмным текстом
                      borderRadius: 6,
                      padding: "12px 16px",
                      marginBottom: 4,
                      transition: "background 0.2s",
                      // Граница тоже адаптируется
                      border: notif.isRead
                        ? "none"
                        : `1px solid ${isDark ? "#1a4a22" : "#b7eb8f"}`,
                    }}
                    actions={
                      !notif.isRead
                        ? [
                            <Button
                              size="small"
                              type="text"
                              onClick={() => handleMarkAsRead(notif.id)}
                            >
                              Прочитано
                            </Button>,
                          ]
                        : []
                    }
                  >
                    <List.Item.Meta
                      avatar={
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: `${config.color}20`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: config.color,
                            fontSize: 16,
                          }}
                        >
                          {config.icon}
                        </div>
                      }
                      title={
                        <Space>
                          <span>{notif.message}</span>
                          {!notif.isRead && (
                            <Badge dot style={{ backgroundColor: "#21A038" }} />
                          )}
                        </Space>
                      }
                      description={
                        <Typography.Text
                          type="secondary"
                          style={{ fontSize: 12 }}
                        >
                          {dayjs(notif.createdAt).format("DD.MM.YYYY HH:mm")}
                        </Typography.Text>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          )}
        </Spin>
      </Card>
    </div>
  );
}
