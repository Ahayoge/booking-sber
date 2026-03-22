// src/pages/LoginPage.tsx
import { useState } from "react";
import { Form, Input, Button, Card, Typography, message } from "antd";
import { useNavigate, Link } from "react-router";
import { useAuthStore } from "@/store/auth.store";
import { authApi } from "@/api/auth.api";
import { AxiosError } from "axios";
import type { ApiError } from "@/types";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const data = await authApi.login(values);
      setUser(data.user);
      message.success("Добро пожаловать!");
      navigate("/rooms");
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      message.error(error.response?.data?.message || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={{ width: 380 }}>
      <Typography.Title level={4} style={{ marginBottom: 24 }}>
        Вход в систему
      </Typography.Title>
      <Form layout="vertical" onFinish={onFinish} autoComplete="off">
        <Form.Item
          label="Email"
          name="email"
          rules={[
            {
              required: true,
              type: "email",
              message: "Введите корректный email",
            },
          ]}
        >
          <Input placeholder="ivan.ivanov@sber.ru" size="large" />
        </Form.Item>

        <Form.Item
          label="Пароль"
          name="password"
          rules={[{ required: true, message: "Введите пароль" }]}
        >
          <Input.Password placeholder="Пароль" size="large" />
        </Form.Item>

        <Form.Item style={{ marginBottom: 8 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            size="large"
          >
            Войти
          </Button>
        </Form.Item>

        <Typography.Text type="secondary">
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </Typography.Text>
      </Form>
    </Card>
  );
}
