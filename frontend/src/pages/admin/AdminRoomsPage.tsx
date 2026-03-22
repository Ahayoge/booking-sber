// src/pages/admin/AdminRoomsPage.tsx
import { useState, useEffect, useCallback } from "react";
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Typography,
  Popconfirm,
  message,
  Switch,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { roomsApi, type CreateRoomPayload } from "@/api/rooms.api";
import type { User, Room, RoomType, RoomStatus, RoomOwnership } from "@/types";
import { AxiosError } from "axios";
import type { ApiError } from "@/types";
import { List, Avatar } from "antd";
import { TeamOutlined, UserOutlined } from "@ant-design/icons";
import { adminApi } from "@/api/admin.api";
import RoomImageUpload from "@/components/RoomImageUpload";

const ROOM_TYPE_OPTIONS = [
  { value: "MEETING_ROOM", label: "Переговорная" },
  { value: "COWORKING", label: "Коворкинг" },
  { value: "MEDIA_STUDIO", label: "Медиастудия" },
  { value: "GYM", label: "Спортзал" },
  { value: "OTHER", label: "Другое" },
];

const EQUIPMENT_OPTIONS = [
  "проектор",
  "доска",
  "микрофоны",
  "видеоконференция",
  "телевизор",
  "кондиционер",
  "принтер",
];

export default function AdminRoomsPage() {
  const [ownersModalOpen, setOwnersModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [owners, setOwners] = useState<RoomOwnership[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchRooms = useCallback(async (currentPage = 1) => {
    setLoading(true);
    try {
      // Admin видит все помещения включая MAINTENANCE
      const res = await roomsApi.getAll({ page: currentPage, limit: 10 });
      setRooms(res.data.data);
      setTotal(res.data.meta.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms(page);
  }, [page]);

  const openCreateModal = () => {
    setEditingRoom(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    form.setFieldsValue({
      ...room,
      status: room.status === "ACTIVE", // Switch принимает boolean
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    setSubmitLoading(true);
    try {
      const payload: CreateRoomPayload = {
        ...values,
        // Преобразуем boolean Switch обратно в строку статуса
        status: values.status ? "ACTIVE" : "MAINTENANCE",
        equipment: values.equipment ?? [],
      };

      if (editingRoom) {
        await roomsApi.update(editingRoom.id, payload);
        message.success("Помещение обновлено");
      } else {
        await roomsApi.create(payload);
        message.success("Помещение создано");
      }
      setModalOpen(false);
      fetchRooms(page);
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      message.error(error.response?.data?.message || "Ошибка сохранения");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await roomsApi.delete(id);
      message.success("Помещение удалено");
      fetchRooms(page);
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      message.error(error.response?.data?.message || "Ошибка удаления");
    }
  };

  const columns: ColumnsType<Room> = [
    {
      title: "Название",
      dataIndex: "name",
      render: (name: string, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{name}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.address}, эт. {record.floor}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Тип",
      dataIndex: "type",
      render: (type: RoomType) => (
        <Tag>
          {ROOM_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type}
        </Tag>
      ),
    },
    {
      title: "Вместимость",
      dataIndex: "capacity",
      render: (c: number) => `${c} чел.`,
    },
    {
      title: "Оборудование",
      dataIndex: "equipment",
      render: (eq: string[]) => (
        <Space wrap>
          {eq.slice(0, 2).map((e) => (
            <Tag key={e} style={{ fontSize: 11 }}>
              {e}
            </Tag>
          ))}
          {eq.length > 2 && (
            <Tag style={{ fontSize: 11 }}>+{eq.length - 2}</Tag>
          )}
        </Space>
      ),
    },
    {
      title: "Статус",
      dataIndex: "status",
      render: (status: RoomStatus) => (
        <Tag color={status === "ACTIVE" ? "green" : "orange"}>
          {status === "ACTIVE" ? "Активно" : "Обслуживание"}
        </Tag>
      ),
    },
    {
      title: "Действия",
      render: (_, record) => (
        <Space>
          <Button
            size="large"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          />
          <Button
            size="large"
            icon={<TeamOutlined />}
            onClick={() => openOwnersModal(record)}
            title="Управление владельцами"
          />

          <Popconfirm
            title="Удалить помещение?"
            description="Удаление невозможно при наличии активных броней."
            okText="Удалить"
            cancelText="Отмена"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const openOwnersModal = async (room: Room) => {
    setSelectedRoom(room);
    setOwnersModalOpen(true);
    const [ownersRes, usersRes] = await Promise.all([
      adminApi.getRoomOwners(room.id),
      adminApi.getUsers({ limit: 100 }),
    ]);
    setOwners(ownersRes.data);
    setAllUsers(usersRes.data.data);
  };

  const handleAssignOwner = async () => {
    if (!selectedRoom || !selectedUserId) return;
    try {
      await adminApi.assignRoomOwner(selectedRoom.id, selectedUserId);
      message.success("Владелец назначен");
      const res = await adminApi.getRoomOwners(selectedRoom.id);
      setOwners(res.data);
      setSelectedUserId(undefined);
    } catch (err: any) {
      message.error(err.response?.data?.message || "Ошибка");
    }
  };

  const handleRemoveOwner = async (userId: string) => {
    if (!selectedRoom) return;
    try {
      await adminApi.removeRoomOwner(selectedRoom.id, userId);
      message.success("Владелец снят");
      const res = await adminApi.getRoomOwners(selectedRoom.id);
      setOwners(res.data);
    } catch {
      message.error("Ошибка");
    }
  };

  return (
    <div>
      <Space
        style={{
          marginBottom: 16,
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <Typography.Title level={3} style={{ margin: 0 }}>
          Управление помещениями
        </Typography.Title>
        <Button
          size="large"
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateModal}
        >
          Добавить
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={rooms}
        rowKey="id"
        loading={loading}
        pagination={{ current: page, total, pageSize: 10, onChange: setPage }}
      />

      {/* ─── Модалка создания / редактирования ────────────────────────── */}
      <Modal
        title={editingRoom ? "Редактировать помещение" : "Новое помещение"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={form.submit}
        okText="Сохранить"
        confirmLoading={submitLoading}
        width={560}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 16 }}
        >
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                label="Название"
                name="name"
                rules={[
                  { required: true, min: 2, message: "Введите название" },
                ]}
              >
                <Input placeholder="Название помещения" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Статус"
                name="status"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch
                  checkedChildren="Активно"
                  unCheckedChildren="Обслуживание"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Тип"
                name="type"
                rules={[{ required: true, message: "Выберите тип" }]}
              >
                <Select
                  options={ROOM_TYPE_OPTIONS}
                  placeholder="Выберите тип"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Вместимость (чел.)"
                name="capacity"
                rules={[{ required: true, message: "Укажите вместимость" }]}
              >
                <InputNumber min={1} max={500} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                label="Адрес"
                name="address"
                rules={[{ required: true, message: "Укажите адрес" }]}
              >
                <Input placeholder="ул. Вавилова, 19" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Этаж"
                name="floor"
                rules={[{ required: true, message: "Укажите этаж" }]}
              >
                <InputNumber min={1} max={200} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Оборудование" name="equipment">
            <Select
              mode="tags"
              placeholder="Добавьте теги оборудования"
              options={EQUIPMENT_OPTIONS.map((e) => ({ value: e, label: e }))}
            />
          </Form.Item>

          <Form.Item label="Фотография помещения" name="photoUrl">
            <RoomImageUpload />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Владельцы: ${selectedRoom?.name}`}
        open={ownersModalOpen}
        onCancel={() => setOwnersModalOpen(false)}
        footer={null}
        width={500}
      >
        <Space.Compact style={{ width: "100%", marginBottom: 16 }}>
          <Select
            placeholder="Выберите сотрудника"
            style={{ flex: 1 }}
            value={selectedUserId}
            onChange={setSelectedUserId}
            showSearch
            optionFilterProp="label"
            options={allUsers
              .filter((u) => !owners.find((o) => o.userId === u.id))
              .map((u) => ({ value: u.id, label: `${u.name} (${u.email})` }))}
          />
          <Button
            type="primary"
            onClick={handleAssignOwner}
            disabled={!selectedUserId}
          >
            Назначить
          </Button>
        </Space.Compact>

        <List
          dataSource={owners}
          locale={{ emptyText: "Нет владельцев" }}
          renderItem={(ownership) => (
            <List.Item
              actions={[
                <Popconfirm
                  title="Снять владельца?"
                  okText="Да"
                  cancelText="Нет"
                  onConfirm={() => handleRemoveOwner(ownership.userId)}
                >
                  <Button size="small" danger>
                    Снять
                  </Button>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} />}
                title={ownership.user.name}
                description={`${ownership.user.email} · ${ownership.user.department ?? "—"}`}
              />
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
}

// Нужен импорт Row/Col — добавь в импорты antd выше:
import { Row, Col } from "antd";
