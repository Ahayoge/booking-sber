// src/pages/RoomsPage.tsx
import { useState, useEffect, useCallback } from "react";
import {
  Row,
  Col,
  Card,
  Typography,
  Select,
  InputNumber,
  Button,
  Tag,
  Empty,
  Spin,
  Pagination,
  DatePicker,
  Space,
  Badge,
  Image,
} from "antd";
import {
  EnvironmentOutlined,
  TeamOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router";
import dayjs, { Dayjs } from "dayjs";
import { roomsApi } from "@/api/rooms.api";
import type { Room, RoomType } from "@/types";

const { RangePicker } = DatePicker;
const { Meta } = Card;

// Словарь для отображения типов на русском
const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  MEETING_ROOM: "Переговорная",
  COWORKING: "Коворкинг",
  MEDIA_STUDIO: "Медиастудия",
  GYM: "Спортзал",
  OTHER: "Другое",
};

const ROOM_TYPE_COLORS: Record<RoomType, string> = {
  MEETING_ROOM: "blue",
  COWORKING: "green",
  MEDIA_STUDIO: "purple",
  GYM: "orange",
  OTHER: "default",
};

// Популярные теги оборудования для быстрого выбора
const EQUIPMENT_OPTIONS = [
  "проектор",
  "доска",
  "микрофоны",
  "видеоконференция",
  "телевизор",
  "кондиционер",
  "принтер",
];

export default function RoomsPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // Состояние фильтров
  const [type, setType] = useState<RoomType | undefined>();
  const [minCapacity, setMinCapacity] = useState<number | undefined>();
  const [equipment, setEquipment] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

  const fetchRooms = useCallback(
    async (currentPage = 1) => {
      setLoading(true);
      try {
        const res = await roomsApi.getAll({
          page: currentPage,
          limit: 9,
          type,
          minCapacity,
          equipment: equipment.length > 0 ? equipment : undefined,
          dateFrom: dateRange?.[0].toISOString(),
          dateTo: dateRange?.[1].toISOString(),
        });
        setRooms(res.data.data);
        setTotal(res.data.meta.total);
      } finally {
        setLoading(false);
      }
    },
    [type, minCapacity, equipment, dateRange],
  );

  useEffect(() => {
    fetchRooms(page);
  }, [page]);

  const handleSearch = () => {
    setPage(1);
    fetchRooms(1);
  };
  const handleReset = () => {
    setType(undefined);
    setMinCapacity(undefined);
    setEquipment([]);
    setDateRange(null);
    setPage(1);
    fetchRooms(1);
  };

  return (
    <div>
      <Typography.Title level={3} style={{ marginBottom: 16 }}>
        Помещения
      </Typography.Title>

      {/* ─── Блок фильтров ─────────────────────────────────────────────── */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Select
              size="large"
              placeholder="Тип помещения"
              allowClear
              style={{ width: "100%" }}
              value={type}
              onChange={setType}
              options={Object.entries(ROOM_TYPE_LABELS).map(
                ([value, label]) => ({ value, label }),
              )}
            />
          </Col>

          <Col xs={24} sm={12} md={5}>
            <InputNumber
              size="large"
              placeholder="Мин. вместимость"
              min={1}
              max={500}
              style={{ width: "100%" }}
              value={minCapacity}
              onChange={(v) => setMinCapacity(v ?? undefined)}
            />
          </Col>

          <Col xs={24} sm={24} md={8}>
            <Select
              size="large"
              mode="multiple"
              placeholder="Оборудование"
              style={{ width: "100%" }}
              value={equipment}
              onChange={setEquipment}
              options={EQUIPMENT_OPTIONS.map((e) => ({ value: e, label: e }))}
            />
          </Col>

          <Col xs={24} sm={12} md={5}>
            <Space.Compact style={{ width: "100%" }}>
              <Button
                size="large"
                icon={<SearchOutlined />}
                type="primary"
                onClick={handleSearch}
              >
                Найти
              </Button>
              <Button size="large" onClick={handleReset}>
                Сбросить
              </Button>
            </Space.Compact>
          </Col>

          <Col xs={24}>
            <RangePicker
              size="large"
              showTime={{ format: "HH:mm" }}
              format="DD.MM.YYYY HH:mm"
              placeholder={["Начало периода", "Конец периода"]}
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
              disabledDate={(d) => d.isBefore(dayjs(), "day")}
              style={{ width: "100%", maxWidth: 480 }}
            />
          </Col>
        </Row>
      </Card>

      {/* ─── Список помещений ───────────────────────────────────────────── */}
      <Spin spinning={loading}>
        {rooms.length === 0 && !loading ? (
          <Empty description="Нет доступных помещений по заданным фильтрам" />
        ) : (
          <>
            <Row gutter={[16, 16]}>
              {rooms.map((room) => (
                <Col key={room.id} xs={24} sm={12} lg={8}>
                  <Card
                    hoverable
                    onClick={() => navigate(`/rooms/${room.id}`)}
                    cover={
                      room.photoUrl ? (
                        <Image
                          src={room.photoUrl}
                          alt={room.name}
                          height={160}
                          style={{
                            objectFit: "cover",
                            borderRadius: "8px 8px 0px 0px",
                          }}
                          preview={false}
                        />
                      ) : (
                        <div
                          style={{
                            height: 160,
                            background: "#f5f5f5",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 48,
                          }}
                        >
                          🏢
                        </div>
                      )
                    }
                    actions={[
                      <Button
                        type="primary"
                        size="large"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/rooms/${room.id}`);
                        }}
                      >
                        Забронировать
                      </Button>,
                    ]}
                  >
                    <Meta
                      title={
                        <Space>
                          <span>{room.name}</span>
                          {room.status === "MAINTENANCE" && (
                            <Badge status="warning" text="Обслуживание" />
                          )}
                        </Space>
                      }
                      description={
                        <Space
                          direction="vertical"
                          size={4}
                          style={{ width: "100%" }}
                        >
                          <Tag color={ROOM_TYPE_COLORS[room.type]}>
                            {ROOM_TYPE_LABELS[room.type]}
                          </Tag>
                          <Space>
                            <EnvironmentOutlined />
                            <span>
                              {room.address}, эт. {room.floor}
                            </span>
                          </Space>
                          <Space>
                            <TeamOutlined />
                            <span>до {room.capacity} чел.</span>
                          </Space>
                          <div style={{ marginTop: 4 }}>
                            {room.equipment.slice(0, 3).map((eq) => (
                              <Tag
                                key={eq}
                                style={{
                                  marginBottom: 2,
                                  fontSize: 11,
                                  marginRight: 5,
                                }}
                              >
                                {eq}
                              </Tag>
                            ))}
                            {room.equipment.length > 3 && (
                              <Tag style={{ fontSize: 11 }}>
                                +{room.equipment.length - 3}
                              </Tag>
                            )}
                          </div>
                        </Space>
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>

            <div style={{ textAlign: "center", marginTop: 24 }}>
              <Pagination
                current={page}
                total={total}
                pageSize={9}
                onChange={setPage}
                showTotal={(t) => `Всего ${t} помещений`}
              />
            </div>
          </>
        )}
      </Spin>
    </div>
  );
}
