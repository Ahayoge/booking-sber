// src/pages/owner/tabs/OwnerBlockedSlotsTab.tsx
import { useState, useEffect } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  DatePicker,
  Input,
  Space,
  Typography,
  Popconfirm,
  Tag,
  message,
  Card,
  Alert,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, LockOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { roomOwnerApi } from "@/api/room-owner.api";
import type { RoomBlockedSlot } from "@/types";

const { RangePicker } = DatePicker;
interface Props {
  roomId: string;
}

export default function OwnerBlockedSlotsTab({ roomId }: Props) {
  const [slots, setSlots] = useState<RoomBlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const res = await roomOwnerApi.getBlockedSlots(roomId);
      setSlots(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [roomId]);

  const handleBlock = async (values: {
    range: [Dayjs, Dayjs];
    reason?: string;
  }) => {
    setSubmitting(true);
    try {
      const result = await roomOwnerApi.blockSlot(roomId, {
        startTime: values.range[0].toISOString(),
        endTime: values.range[1].toISOString(),
        reason: values.reason,
      });

      // Предупреждаем если были отменены брони
      if (result.data.cancelledBookings > 0) {
        message.warning(
          `Слот заблокирован. Отменено броней: ${result.data.cancelledBookings}. Пользователи уведомлены.`,
          6,
        );
      } else {
        message.success("Слот заблокирован");
      }

      form.resetFields();
      setModalOpen(false);
      fetchSlots();
    } catch (err: any) {
      message.error(err.response?.data?.message || "Ошибка при блокировке");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnblock = async (slotId: string) => {
    try {
      await roomOwnerApi.unblockSlot(roomId, slotId);
      message.success("Блокировка снята");
      fetchSlots();
    } catch {
      message.error("Ошибка при снятии блокировки");
    }
  };

  const columns: ColumnsType<RoomBlockedSlot> = [
    {
      title: "Дата и время",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>
            {dayjs(r.startTime).format("DD.MM.YYYY")}
          </Typography.Text>
          <Typography.Text type="secondary">
            {dayjs(r.startTime).format("HH:mm")} –{" "}
            {dayjs(r.endTime).format("HH:mm")}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Причина",
      dataIndex: "reason",
      render: (reason?: string) =>
        reason ? (
          <Tag color="orange">{reason}</Tag>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    {
      title: "Добавлено",
      dataIndex: "createdAt",
      render: (t: string) => dayjs(t).format("DD.MM.YYYY HH:mm"),
    },
    {
      title: "Действия",
      render: (_, r) =>
        dayjs(r.startTime).isAfter(dayjs()) ? (
          <Popconfirm
            title="Снять блокировку?"
            okText="Да"
            cancelText="Нет"
            onConfirm={() => handleUnblock(r.id)}
          >
            <Button size="small">Разблокировать</Button>
          </Popconfirm>
        ) : (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            В прошлом
          </Typography.Text>
        ),
    },
  ];

  return (
    <div>
      <Card
        title={
          <Space>
            <LockOutlined />
            Заблокированные слоты
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
          >
            Заблокировать слот
          </Button>
        }
      >
        <Alert
          type="warning"
          showIcon
          message="При блокировке слота все существующие брони в этот период будут автоматически отменены, а пользователи уведомлены."
          style={{ marginBottom: 16 }}
        />
        <Table
          columns={columns}
          dataSource={slots}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: "Нет активных блокировок" }}
        />
      </Card>

      <Modal
        title="Заблокировать временной слот"
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        onOk={form.submit}
        okText="Заблокировать"
        okButtonProps={{ danger: true }}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleBlock}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            label="Период блокировки"
            name="range"
            rules={[{ required: true, message: "Выберите период" }]}
          >
            <RangePicker
              showTime={{ format: "HH:mm", minuteStep: 15 }}
              format="DD.MM.YYYY HH:mm"
              style={{ width: "100%" }}
              disabledDate={(d) => d.isBefore(dayjs(), "day")}
            />
          </Form.Item>
          <Form.Item
            label="Причина (будет показана пользователям)"
            name="reason"
          >
            <Input placeholder="Например: технический перерыв, уборка" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
