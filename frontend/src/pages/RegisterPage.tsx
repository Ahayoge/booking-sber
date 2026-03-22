import { useState } from "react";
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Select,
  message,
  Alert,
} from "antd";
import { useNavigate, Link } from "react-router";
import { authApi } from "@/api/auth.api";
import { AxiosError } from "axios";
import type { ApiError } from "@/types";

const ROLE_OPTIONS = [
  {
    value: "EMPLOYEE",
    label: "👤 Сотрудник",
    description: "Может просматривать и бронировать помещения",
  },
  {
    value: "ROOM_OWNER",
    label: "🔑 Владелец помещения",
    description: "Управляет расписанием и бронями своих помещений",
  },
  {
    value: "ADMIN",
    label: "⚙️ Администратор",
    description: "Полный доступ ко всем функциям системы",
  },
];

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values: {
    email: string;
    password: string;
    name: string;
    department: string;
    role: string;
  }) => {
    setLoading(true);
    try {
      await authApi.register(values);
      message.success("Регистрация успешна! Войдите в систему.");
      navigate("/login");
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      message.error(error.response?.data?.message || "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={{ width: 420 }}>
      <Typography.Title level={4} style={{ marginBottom: 8 }}>
        Регистрация
      </Typography.Title>

      {/* Предупреждение что выбор роли только для тестирования */}
      <Alert
        type="warning"
        showIcon
        title="Тестовый режим"
        description="Выбор роли доступен только для тестирования. В продакшне роли назначаются администратором."
        style={{ marginBottom: 20, fontSize: 12 }}
      />

      <Form
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ role: "EMPLOYEE" }}
      >
        <Form.Item
          label="Имя и фамилия"
          name="name"
          rules={[{ required: true, min: 2, message: "Введите имя" }]}
        >
          <Input placeholder="Иван Иванов" size="large" />
        </Form.Item>

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
          <Input placeholder="ivan@sber.ru" size="large" />
        </Form.Item>

        <Form.Item
          label="Отдел"
          name="department"
          rules={[{ required: true, message: "Укажите отдел" }]}
        >
          <Input placeholder="Отдел разработки" size="large" />
        </Form.Item>

        <Form.Item
          label="Пароль"
          name="password"
          rules={[{ required: true, min: 8, message: "Минимум 8 символов" }]}
        >
          <Input.Password placeholder="Минимум 8 символов" size="large" />
        </Form.Item>

        {/* ✅ Выбор роли */}
        <Form.Item
          label="Роль в системе"
          name="role"
          rules={[{ required: true, message: "Выберите роль" }]}
        >
          <Select size="large" optionLabelProp="label">
            {ROLE_OPTIONS.map((opt) => (
              <Select.Option
                key={opt.value}
                value={opt.value}
                label={opt.label}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: "#8c8c8c" }}>
                    {opt.description}
                  </div>
                </div>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item style={{ marginBottom: 8 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            size="large"
          >
            Зарегистрироваться
          </Button>
        </Form.Item>

        <Typography.Text type="secondary">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </Typography.Text>
      </Form>
    </Card>
  );
}
