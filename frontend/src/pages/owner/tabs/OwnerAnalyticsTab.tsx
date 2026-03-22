// src/pages/owner/tabs/OwnerAnalyticsTab.tsx
import { useEffect, useState } from "react";
import { Row, Col, Card, Statistic, Spin, Typography } from "antd";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { roomOwnerApi } from "@/api/room-owner.api";
import type { RoomAnalytics } from "@/types";

interface Props {
  roomId: string;
}

export default function OwnerAnalyticsTab({ roomId }: Props) {
  const [data, setData] = useState<RoomAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    roomOwnerApi
      .getAnalytics(roomId)
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, [roomId]);

  return (
    <Spin spinning={loading}>
      <Typography.Text
        type="secondary"
        style={{ display: "block", marginBottom: 16 }}
      >
        Период: {data ? dayjs(data.period.from).format("DD.MM.YYYY") : "—"} –{" "}
        {data ? dayjs(data.period.to).format("DD.MM.YYYY") : "—"} (текущий
        месяц)
      </Typography.Text>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Всего броней"
              value={data?.totalBookings ?? 0}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Подтверждённых"
              value={data?.confirmedBookings ?? 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Предстоящих"
              value={data?.upcomingBookings ?? 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: "#fa8c16" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Процент отмен"
              value={data?.cancellationRate ?? 0}
              suffix="%"
              prefix={<CloseCircleOutlined />}
              valueStyle={{
                color:
                  (data?.cancellationRate ?? 0) > 20 ? "#ff4d4f" : "#595959",
              }}
            />
          </Card>
        </Col>
      </Row>
    </Spin>
  );
}
