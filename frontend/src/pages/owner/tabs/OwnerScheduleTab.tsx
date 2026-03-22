// src/pages/owner/tabs/OwnerScheduleTab.tsx
import { useState, useEffect } from "react";
import {
  Table,
  Switch,
  TimePicker,
  Button,
  Typography,
  message,
  Spin,
  Card,
} from "antd";
import dayjs from "dayjs";
import { roomOwnerApi } from "@/api/room-owner.api";
import type { RoomSchedule } from "@/types";

const DAY_NAMES = [
  "Воскресенье",
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
];
// Порядок отображения: пн–вс
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

interface Props {
  roomId: string;
}

export default function OwnerScheduleTab({ roomId }: Props) {
  const [schedule, setSchedule] = useState<RoomSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    roomOwnerApi
      .getSchedule(roomId)
      .then((res) => setSchedule(res.data))
      .finally(() => setLoading(false));
  }, [roomId]);

  // Обновляем конкретный день в локальном стейте
  const updateDay = (
    dayOfWeek: number,
    field: keyof RoomSchedule,
    value: unknown,
  ) => {
    setSchedule((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, [field]: value } : day,
      ),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await roomOwnerApi.updateSchedule(
        roomId,
        schedule.map(({ dayOfWeek, isOpen, openTime, closeTime }) => ({
          dayOfWeek,
          isOpen,
          openTime,
          closeTime,
        })),
      );
      setSchedule(res.data);
      message.success("Расписание сохранено");
    } catch {
      message.error("Ошибка при сохранении расписания");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: "День недели",
      dataIndex: "dayOfWeek",
      width: 160,
      render: (day: number) => (
        <Typography.Text strong>{DAY_NAMES[day]}</Typography.Text>
      ),
    },
    {
      title: "Открыто",
      dataIndex: "isOpen",
      width: 100,
      render: (isOpen: boolean, record: RoomSchedule) => (
        <Switch
          checked={isOpen}
          checkedChildren="Да"
          unCheckedChildren="Нет"
          onChange={(val) => updateDay(record.dayOfWeek, "isOpen", val)}
        />
      ),
    },
    {
      title: "Открытие",
      dataIndex: "openTime",
      render: (time: string, record: RoomSchedule) => (
        <TimePicker
          value={dayjs(time, "HH:mm")}
          format="HH:mm"
          minuteStep={15}
          disabled={!record.isOpen}
          allowClear={false}
          onChange={(t) =>
            t && updateDay(record.dayOfWeek, "openTime", t.format("HH:mm"))
          }
        />
      ),
    },
    {
      title: "Закрытие",
      dataIndex: "closeTime",
      render: (time: string, record: RoomSchedule) => (
        <TimePicker
          value={dayjs(time, "HH:mm")}
          format="HH:mm"
          minuteStep={15}
          disabled={!record.isOpen}
          allowClear={false}
          onChange={(t) =>
            t && updateDay(record.dayOfWeek, "closeTime", t.format("HH:mm"))
          }
        />
      ),
    },
  ];

  // Сортируем дни в порядке пн–вс
  const sortedSchedule = [...schedule].sort(
    (a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek),
  );

  return (
    <Spin spinning={loading}>
      <Card
        title="Рабочее расписание помещения"
        extra={
          <Button type="primary" onClick={handleSave} loading={saving}>
            Сохранить
          </Button>
        }
      >
        <Typography.Text
          type="secondary"
          style={{ display: "block", marginBottom: 16 }}
        >
          Пользователи не смогут бронировать помещение в закрытые дни или вне
          рабочих часов.
        </Typography.Text>
        <Table
          dataSource={sortedSchedule}
          columns={columns}
          rowKey="dayOfWeek"
          pagination={false}
          size="small"
          // Выделяем выходные дни серым фоном
          rowClassName={(record) =>
            record.dayOfWeek === 0 || record.dayOfWeek === 6
              ? "weekend-row"
              : ""
          }
        />
      </Card>
    </Spin>
  );
}
