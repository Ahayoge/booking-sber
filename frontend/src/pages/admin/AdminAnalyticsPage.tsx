// src/pages/admin/AdminAnalyticsPage.tsx
import { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Statistic,
  Typography,
  Select,
  Table,
  Space,
  Spin,
  Tag,
} from "antd";
import {
  TrophyOutlined,
  BarChartOutlined,
  CloseCircleOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { adminApi } from "@/api/admin.api";

type Period = "day" | "week" | "month";

interface TopRoom {
  room: { id: string; name: string; type: string; address: string };
  bookingsCount: number;
}

interface PeriodCount {
  label: string;
  count: number;
  from: string;
  to: string;
}

interface CancellationData {
  total: number;
  confirmed: number;
  cancelled: number;
  cancellationRate: number;
}

interface HeatmapCell {
  dayOfWeek: number;
  hour: number;
  count: number;
}

const DAY_NAMES = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const PERIOD_OPTIONS = [
  { value: "day", label: "По дням (7 дней)" },
  { value: "week", label: "По неделям (8 недель)" },
  { value: "month", label: "По месяцам (12 мес.)" },
];

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [topRooms, setTopRooms] = useState<TopRoom[]>([]);
  const [periodCounts, setPeriodCounts] = useState<PeriodCount[]>([]);
  const [cancellation, setCancellation] = useState<CancellationData | null>(
    null,
  );
  const [heatmap, setHeatmap] = useState<HeatmapCell[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        // Загружаем все данные параллельно
        const [topRes, countRes, cancelRes, heatRes] = await Promise.all([
          adminApi.getTopRooms(),
          adminApi.getBookingsCount(period),
          adminApi.getCancellationRate(),
          adminApi.getLoadByTime(),
        ]);
        setTopRooms(topRes.data);
        setPeriodCounts(countRes.data);
        setCancellation(cancelRes.data);
        setHeatmap(heatRes.data);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [period]);

  // Вычисляем максимальное значение для нормализации цвета в тепловой карте
  const maxHeatCount = Math.max(...heatmap.map((h) => h.count), 1);

  // Получаем количество для конкретной ячейки тепловой карты
  const getHeatValue = (day: number, hour: number): number => {
    return (
      heatmap.find((h) => h.dayOfWeek === day && h.hour === hour)?.count ?? 0
    );
  };

  // Вычисляем цвет ячейки: от белого до тёмно-зелёного
  const getHeatColor = (value: number): string => {
    if (value === 0) return "#f5f5f5";
    const intensity = Math.round((value / maxHeatCount) * 4); // 0–4
    const colors = ["#f5f5f5", "#d9f7be", "#95de64", "#52c41a", "#237804"];
    return colors[intensity] ?? colors[4];
  };

  // Колонки для таблицы топ-5 помещений
  const topRoomsColumns = [
    {
      title: "№",
      render: (_: any, __: any, index: number) => index + 1,
      width: 40,
    },
    {
      title: "Помещение",
      render: (_: any, record: TopRoom) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{record.room?.name}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.room?.address}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Броней",
      dataIndex: "bookingsCount",
      render: (count: number) => <Tag color="blue">{count}</Tag>,
    },
  ];

  // Колонки для графика количества броней по периодам
  const countColumns = [
    { title: "Период", dataIndex: "label" },
    {
      title: "Броней",
      dataIndex: "count",
      render: (count: number) => (
        <Space>
          {/* Простая текстовая "полоска" — без внешних библиотек */}
          <div
            style={{
              width: `${Math.round((count / Math.max(...periodCounts.map((p) => p.count), 1)) * 120)}px`,
              minWidth: 4,
              height: 16,
              background: "#21A038",
              borderRadius: 2,
            }}
          />
          <span>{count}</span>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3} style={{ marginBottom: 24 }}>
        Аналитика
      </Typography.Title>

      <Spin spinning={loading}>
        {/* ─── Сводные показатели ──────────────────────────────────────── */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Всего броней (тек. месяц)"
                value={cancellation?.total ?? 0}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: "#21A038" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Подтверждённых броней"
                value={cancellation?.confirmed ?? 0}
                prefix={<BarChartOutlined />}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Процент отмен"
                value={cancellation?.cancellationRate ?? 0}
                suffix="%"
                prefix={<CloseCircleOutlined />}
                valueStyle={{
                  color:
                    (cancellation?.cancellationRate ?? 0) > 20
                      ? "#ff4d4f"
                      : "#fa8c16",
                }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          {/* ─── Топ-5 помещений ───────────────────────────────────────── */}
          <Col xs={24} lg={10}>
            <Card
              title={
                <Space>
                  <TrophyOutlined style={{ color: "#faad14" }} />
                  Топ-5 помещений
                </Space>
              }
            >
              <Table
                dataSource={topRooms}
                columns={topRoomsColumns}
                rowKey={(r) => r.room?.id}
                pagination={false}
                size="small"
              />
            </Card>
          </Col>

          {/* ─── Количество броней по периодам ───────────────────────── */}
          <Col xs={24} lg={14}>
            <Card
              title="Количество броней"
              extra={
                <Select
                  value={period}
                  onChange={setPeriod}
                  options={PERIOD_OPTIONS}
                  style={{ width: 200 }}
                  size="small"
                />
              }
            >
              <Table
                dataSource={periodCounts}
                columns={countColumns}
                rowKey="label"
                pagination={false}
                size="small"
              />
            </Card>
          </Col>

          {/* ─── Тепловая карта загруженности ────────────────────────── */}
          <Col xs={24}>
            <Card title="Загруженность по дням и часам (тепловая карта)">
              <Typography.Text
                type="secondary"
                style={{ display: "block", marginBottom: 12 }}
              >
                Цвет: светлый = мало броней, тёмно-зелёный = много
              </Typography.Text>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                  <thead>
                    <tr>
                      {/* Заголовок: часы 0–23 */}
                      <th
                        style={{ width: 36, padding: "2px 4px", fontSize: 11 }}
                      ></th>
                      {Array.from({ length: 24 }, (_, h) => (
                        <th
                          key={h}
                          style={{
                            width: 32,
                            padding: "2px 0",
                            textAlign: "center",
                            fontSize: 10,
                            color: "#8c8c8c",
                            fontWeight: "normal",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Строки: дни недели 0(Вс)–6(Сб) */}
                    {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                      <tr key={day}>
                        <td
                          style={{
                            padding: "2px 6px 2px 0",
                            fontSize: 11,
                            color: "#8c8c8c",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {DAY_NAMES[day]}
                        </td>
                        {Array.from({ length: 24 }, (_, hour) => {
                          const val = getHeatValue(day, hour);
                          return (
                            <td
                              key={hour}
                              title={`${DAY_NAMES[day]} ${hour}:00 — ${val} броней`}
                            >
                              <div
                                style={{
                                  width: 28,
                                  height: 24,
                                  borderRadius: 3,
                                  margin: 1,
                                  background: getHeatColor(val),
                                  cursor: val > 0 ? "pointer" : "default",
                                }}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
}
