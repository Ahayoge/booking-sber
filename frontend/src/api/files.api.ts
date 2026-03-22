import api from "./axios";

export const filesApi = {
  uploadRoomImage: (file: File) => {
    // FormData — стандартный способ отправки файлов через HTTP
    const formData = new FormData();
    formData.append("file", file);

    return api.post<{ url: string; filename: string; size: number }>(
      "/files/upload/room-image",
      formData,
      {
        headers: {
          // Переопределяем Content-Type — axios должен выставить boundary автоматически
          "Content-Type": "multipart/form-data",
        },
      },
    );
  },
};
