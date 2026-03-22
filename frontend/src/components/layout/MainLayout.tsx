// src/components/layout/MainLayout.tsx
import { Outlet, useNavigate, useLocation } from "react-router";
import { Layout, Menu, Badge, Avatar, Dropdown, Switch } from "antd";
import { useState } from "react";
import { roomsApi } from "@/api/rooms.api";
import { useThemeStore } from "@/store/theme.store";
import SberLogo from "@/assets/SberLogo";
import {
  HomeOutlined,
  CalendarOutlined,
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  BarChartOutlined,
  TeamOutlined,
  AppstoreOutlined,
  KeyOutlined,
  SunOutlined,
  MoonOutlined,
} from "@ant-design/icons";
import { useAuthStore } from "@/store/auth.store";
import { useNotificationsStore } from "@/store/notifications.store";
import { authApi } from "@/api/auth.api";
import { useEffect } from "react";
import { notificationsApi } from "@/api/notifications.api";

const { Header, Sider, Content } = Layout;

export default function MainLayout() {
  const { isDark, toggle } = useThemeStore();

  const [ownedRooms, setOwnedRooms] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearUser } = useAuthStore();
  const { unreadCount, setUnreadCount } = useNotificationsStore();

  // Загружаем кол-во непрочитанных уведомлений при монтировании
  useEffect(() => {
    notificationsApi
      .getAll(1, 1)
      .then((res) => {
        setUnreadCount(res.data.meta.unreadCount ?? 0);
      })
      .catch(() => {});
  }, [setUnreadCount]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      clearUser();
      navigate("/login");
    }
  };

  // Пункты меню сотрудника
  const employeeMenuItems = [
    {
      key: "/rooms",
      icon: <HomeOutlined style={{ fontSize: 18 }} />,
      label: "Помещения",
    },
    {
      key: "/bookings",
      icon: <CalendarOutlined style={{ fontSize: 18 }} />,
      label: "Мои брони",
    },
    {
      key: "/notifications",
      icon: (
        <Badge count={unreadCount} size="small">
          <BellOutlined style={{ fontSize: 18 }} />
        </Badge>
      ),
      label: "Уведомления",
    },
  ];

  // Загружаем список своих помещений для Room Owner
  useEffect(() => {
    if (user?.role !== "ROOM_OWNER" && user?.role !== "ADMIN") return;

    // Получаем список помещений пользователя через существующий API
    roomsApi
      .getAll({ limit: 50 })
      .then((res) => {
        // Фильтруем только те помещения где текущий пользователь — владелец
        // Для этого используем отдельный запрос к /rooms?ownedByMe=true
        // Пока просто сохраняем все (в следующем шаге добавим фильтр на бэке)
        setOwnedRooms(res.data.data.map((r) => ({ id: r.id, name: r.name })));
      })
      .catch(() => {});
  }, [user]);

  // Пункты меню владельца помещений
  const ownerMenuItems =
    (user?.role === "ROOM_OWNER" || user?.role === "ADMIN") &&
    ownedRooms.length > 0
      ? [
          { type: "divider" as const },
          {
            key: "owner-group",
            icon: <KeyOutlined style={{ fontSize: 18 }} />,
            label: "Мои помещения",
            // Подменю с каждым помещением владельца
            children: ownedRooms.map((room) => ({
              key: `/owner/rooms/${room.id}`,
              label: room.name,
            })),
          },
        ]
      : [];

  // Дополнительные пункты для Admin
  const adminMenuItems =
    user?.role === "ADMIN"
      ? [
          { type: "divider" as const },
          {
            key: "/admin/rooms",
            icon: <AppstoreOutlined style={{ fontSize: 18 }} />,
            label: "Управление залами",
          },
          {
            key: "/admin/bookings",
            icon: <CalendarOutlined style={{ fontSize: 18 }} />,
            label: "Все брони",
          },
          {
            key: "/admin/users",
            icon: <TeamOutlined style={{ fontSize: 18 }} />,
            label: "Пользователи",
          },
          {
            key: "/admin/analytics",
            icon: <BarChartOutlined style={{ fontSize: 18 }} />,
            label: "Аналитика",
          },
        ]
      : [];

  const userMenuItems = [
    { key: "logout", icon: <LogoutOutlined />, label: "Выйти", danger: true },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        theme="light"
        style={{ borderRight: `1px solid ${isDark ? "#303030" : "#f0f0f0"}` }}
      >
        <div
          style={{
            padding: "20px",
            borderBottom: `1px solid ${isDark ? "#303030" : "#f0f0f0"}`,
          }}
        >
          <SberLogo />
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={["owner-group"]}
          items={[...employeeMenuItems, ...ownerMenuItems, ...adminMenuItems]}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0, paddingTop: 8, fontSize: 16 }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: isDark ? "#141414" : "#fff",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            borderBottom: `1px solid ${isDark ? "#303030" : "#f0f0f0"}`,
            gap: 16,
          }}
        >
          {/* ─── Переключатель темы ──────────────────────────────────────── */}
          <Switch
            checked={isDark}
            onChange={toggle}
            checkedChildren={<MoonOutlined />}
            unCheckedChildren={<SunOutlined />}
            style={{ background: isDark ? "#21A038" : undefined }}
          />

          {/* ─── Меню пользователя (без изменений) ──────────────────────── */}
          <Dropdown
            menu={{
              items: userMenuItems,
              onClick: ({ key }) => key === "logout" && handleLogout(),
            }}
          >
            <div
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Avatar
                icon={<UserOutlined />}
                style={{ background: "#21A038" }}
              />
              <span>{user?.name}</span>
            </div>
          </Dropdown>
        </Header>

        <Content style={{ padding: 24, overflow: "auto" }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
