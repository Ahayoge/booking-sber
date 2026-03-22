import { useState } from "react";
import { Upload, Image, Button, Space, message } from "antd";
import {
  InboxOutlined,
  DeleteOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import type { RcFile } from "antd/es/upload";
import { filesApi } from "@/api/files.api";

const { Dragger } = Upload;

interface Props {
  value?: string; // текущий URL (для формы Ant Design)
  onChange?: (url: string | undefined) => void; // колбэк для формы
}

export default function RoomImageUpload({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);

  // Перехватываем загрузку вручную — не даём antd самому делать запрос
  const handleUpload = async (file: RcFile): Promise<false> => {
    // Клиентская валидация до отправки
    const isImage = file.type.startsWith("image/");
    const isLt5M = file.size / 1024 / 1024 < 5;

    if (!isImage) {
      message.error("Можно загружать только изображения (JPG, PNG, WebP)");
      return false;
    }
    if (!isLt5M) {
      message.error("Файл должен быть не больше 5 МБ");
      return false;
    }

    setUploading(true);
    try {
      const res = await filesApi.uploadRoomImage(file);
      onChange?.(res.data.url); // передаём URL в форму
      message.success("Изображение загружено");
    } catch {
      message.error("Ошибка при загрузке. Попробуйте ещё раз.");
    } finally {
      setUploading(false);
    }

    // Возвращаем false — отменяем стандартное поведение Ant Design Upload
    return false;
  };

  const handleRemove = () => {
    onChange?.(undefined);
  };

  // Если изображение уже загружено — показываем превью с кнопкой удаления
  if (value) {
    return (
      <Space direction="vertical" style={{ width: "100%" }}>
        <div style={{ position: "relative", display: "inline-block" }}>
          <Image
            src={value}
            alt="Фото помещения"
            style={{
              width: "100%",
              maxHeight: 200,
              objectFit: "cover",
              borderRadius: 6,
              border: "1px solid #d9d9d9",
            }}
          />
        </div>
        <Button
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={handleRemove}
        >
          Удалить фото
        </Button>
      </Space>
    );
  }

  // Иначе — показываем зону загрузки
  return (
    <Dragger
      accept="image/jpeg,image/png,image/webp"
      showUploadList={false} // скрываем стандартный список файлов
      beforeUpload={handleUpload} // перехватываем загрузку
      disabled={uploading}
      style={{ borderRadius: 6 }}
    >
      <p className="ant-upload-drag-icon">
        {uploading ? (
          <LoadingOutlined style={{ fontSize: 32, color: "#21A038" }} />
        ) : (
          <InboxOutlined style={{ fontSize: 32, color: "#21A038" }} />
        )}
      </p>
      <p className="ant-upload-text">
        {uploading ? "Загружаем..." : "Нажмите или перетащите файл сюда"}
      </p>
      <p className="ant-upload-hint">
        Поддерживаются JPG, PNG, WebP · Максимум 5 МБ
      </p>
    </Dragger>
  );
}
