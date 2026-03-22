// src/components/layout/AuthLayout.tsx
import { Outlet } from "react-router";
import { Layout, Typography } from "antd";
import SberLogo from "@/assets/SberLogo";

import { theme as antTheme } from "antd";

const { Content } = Layout;

export default function AuthLayout() {
  // Получаем токены текущей темы из Ant Design
  const { token } = antTheme.useToken();

  return (
    <Layout style={{ minHeight: "100vh", background: token.colorBgLayout }}>
      <Content
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <SberLogo />
          <Typography.Text type="secondary">
            Бронирование помещений
          </Typography.Text>
        </div>
        <Outlet />
      </Content>
    </Layout>
  );
}
