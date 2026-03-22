// src/pages/RoomDetailPage.tsx
import { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Button,
  Modal,
  DatePicker,
  Descriptions,
  Space,
  Spin,
  Image,
  Alert,
  Badge,
  message,
  ConfigProvider,
} from "antd";
import {
  EnvironmentOutlined,
  TeamOutlined,
  ArrowLeftOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { useParams, useNavigate } from "react-router";
import dayjs, { Dayjs } from "dayjs";
import locale from "@/locale";
import ruRU from "antd/locale/ru_RU";
import isBetween from "dayjs/plugin/isBetween";
import { roomsApi } from "@/api/rooms.api";
import { bookingsApi } from "@/api/bookings.api";
import type { Room, RoomType } from "@/types";
import { AxiosError } from "axios";
import type { ApiError } from "@/types";

dayjs.extend(isBetween);

const { RangePicker } = DatePicker;

const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  MEETING_ROOM: "Переговорная",
  COWORKING: "Коворкинг",
  MEDIA_STUDIO: "Медиастудия",
  GYM: "Спортзал",
  OTHER: "Другое",
};

export default function RoomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [selectedRange, setSelectedRange] = useState<[Dayjs, Dayjs] | null>(
    null,
  );

  useEffect(() => {
    if (!id) return;
    roomsApi
      .getOne(id)
      .then((res) => setRoom(res.data))
      .finally(() => setLoading(false));
  }, [id]);

  // Проверяем пересечение выбранного диапазона с уже существующими бронями
  // Используется для подсветки занятых слотов в DatePicker
  const isTimeOccupied = (date: Dayjs): boolean => {
    if (!room?.bookings) return false;
    return room.bookings.some((b) =>
      date.isBetween(dayjs(b.startTime), dayjs(b.endTime), "minute", "[)"),
    );
  };

  // Запрещаем выбор дат в прошлом и более 14 дней вперёд
  const disabledDate = (current: Dayjs) => {
    return (
      current.isBefore(dayjs(), "day") ||
      current.isAfter(dayjs().add(14, "day"), "day")
    );
  };

  const handleBook = async () => {
    if (!selectedRange || !id) return;

    const [start, end] = selectedRange;
    const durationMinutes = end.diff(start, "minute");

    // Клиентская валидация — дублирует бэкенд, но даёт мгновенный фидбек
    if (durationMinutes < 30) {
      message.warning("Минимальная длительность брони — 30 минут");
      return;
    }
    if (durationMinutes > 13 * 60) {
      message.warning("Максимальная длительность брони — 13 часов");
      return;
    }

    setBookingLoading(true);
    try {
      await bookingsApi.create({
        roomId: id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });
      message.success("Бронь успешно создана!");
      setModalOpen(false);
      setSelectedRange(null);
      // Обновляем данные комнаты чтобы отобразить новую бронь
      const res = await roomsApi.getOne(id);
      setRoom(res.data);
    } catch (err) {
      const error = err as AxiosError<ApiError>;
      message.error(error.response?.data?.message || "Ошибка при бронировании");
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) return <Spin style={{ display: "block", marginTop: 80 }} />;
  if (!room) return <Alert type="error" message="Помещение не найдено" />;

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate("/rooms")}
        style={{ marginBottom: 16 }}
      >
        Назад к списку
      </Button>

      <Row gutter={[24, 24]}>
        {/* ─── Левая колонка: фото и информация ───────────────────────── */}
        <Col xs={24} lg={14}>
          {room.photoUrl ? (
            <Image
              src={room.photoUrl}
              alt={room.name}
              style={{
                width: "100%",
                maxHeight: 320,
                objectFit: "cover",
                borderRadius: 8,
              }}
            />
          ) : (
            <div
              style={{
                height: 240,
                background: "#f5f5f5",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 80,
              }}
            >
              🏢
            </div>
          )}

          <Card style={{ marginTop: 16 }}>
            <Space style={{ marginBottom: 12 }}>
              <Typography.Title level={3} style={{ margin: 0 }}>
                {room.name}
              </Typography.Title>
              {room.status === "MAINTENANCE" && (
                <Badge status="warning" text="На обслуживании" />
              )}
            </Space>

            <Descriptions column={1} size="small">
              <Descriptions.Item label="Тип">
                <Tag color="blue">{ROOM_TYPE_LABELS[room.type]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Вместимость">
                <TeamOutlined /> до {room.capacity} чел.
              </Descriptions.Item>
              <Descriptions.Item label="Адрес">
                <EnvironmentOutlined /> {room.address}, этаж {room.floor}
              </Descriptions.Item>
              <Descriptions.Item label="Оборудование">
                <Space wrap>
                  {room.equipment.map((eq) => (
                    <Tag key={eq}>{eq}</Tag>
                  ))}
                  {room.equipment.length === 0 && "—"}
                </Space>
              </Descriptions.Item>
            </Descriptions>

            <Button
              type="primary"
              size="large"
              icon={<CalendarOutlined />}
              onClick={() => setModalOpen(true)}
              disabled={room.status === "MAINTENANCE"}
              style={{ marginTop: 16 }}
              block
            >
              {room.status === "MAINTENANCE"
                ? "Недоступно (обслуживание)"
                : "Забронировать"}
            </Button>
          </Card>
        </Col>

        {/* ─── Правая колонка: ближайшие брони ─────────────────────────── */}
        <Col xs={24} lg={10}>
          <Card title="Ближайшие брони" size="small">
            {!room.bookings || room.bookings.length === 0 ? (
              <Typography.Text type="secondary">
                Нет активных броней
              </Typography.Text>
            ) : (
              <Space direction="vertical" style={{ width: "100%" }}>
                {room.bookings.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      padding: "8px 12px",
                      background: "#fff7e6",
                      borderRadius: 6,
                      borderLeft: "3px solid #fa8c16",
                    }}
                  >
                    <Typography.Text strong>
                      {dayjs(b.startTime).format("DD.MM.YYYY")}
                    </Typography.Text>
                    <br />
                    <Typography.Text type="secondary">
                      {dayjs(b.startTime).format("HH:mm")} –{" "}
                      {dayjs(b.endTime).format("HH:mm")}
                    </Typography.Text>
                  </div>
                ))}
              </Space>
            )}
          </Card>
        </Col>
      </Row>

      {/* ─── Модальное окно бронирования ─────────────────────────────────── */}
      <Modal
        title={`Бронирование: ${room.name}`}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setSelectedRange(null);
        }}
        onOk={handleBook}
        okText="Подтвердить бронь"
        cancelText="Отмена"
        confirmLoading={bookingLoading}
        okButtonProps={{ disabled: !selectedRange }}
        width={480}
      >
        <Space
          direction="vertical"
          style={{ width: "100%", padding: "16px 0" }}
        >
          <Typography.Text type="secondary">
            Выберите дату и время начала и окончания брони. Минимум: 30 мин ·
            Максимум: 13 часов · До +14 дней вперёд
          </Typography.Text>

          <ConfigProvider locale={ruRU}>
            <RangePicker
              showTime={{ format: "HH:mm", minuteStep: 15 }}
              format="DD.MM.YYYY HH:mm"
              placeholder={["Начало", "Конец"]}
              style={{ width: "100%" }}
              disabledDate={disabledDate}
              locale={locale}
              // Предупреждение если выбранное время уже занято
              cellRender={(current, info) => {
                // Если панель не 'date' (например, выбор месяца или года при навигации)
                // — возвращаем стандартный рендер без изменений
                if (info.type !== "date") return info.originNode;

                // Здесь current гарантированно является Dayjs-объектом
                const d = current as Dayjs;
                const occupied = isTimeOccupied(d);

                return (
                  <div
                    className="ant-picker-cell-inner"
                    style={
                      occupied
                        ? { background: "#fff1f0", color: "#ff4d4f" }
                        : {}
                    }
                  >
                    {d.date()}
                  </div>
                );
              }}
              value={selectedRange}
              onChange={(dates) =>
                setSelectedRange(dates as [Dayjs, Dayjs] | null)
              }
            />
          </ConfigProvider>

          {selectedRange && (
            <Alert
              type="info"
              message={`Длительность: ${selectedRange[1].diff(selectedRange[0], "minute")} мин`}
              style={{ marginTop: 8 }}
            />
          )}
        </Space>
      </Modal>
    </div>
  );
}
