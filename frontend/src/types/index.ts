// src/types/index.ts
// Все типы совпадают с Prisma-схемой бэкенда

export type Role = "EMPLOYEE" | "ROOM_OWNER" | "ADMIN";
export type RoomType =
  | "MEETING_ROOM"
  | "COWORKING"
  | "MEDIA_STUDIO"
  | "GYM"
  | "OTHER";
export type RoomStatus = "ACTIVE" | "MAINTENANCE";
export type BookingStatus = "CONFIRMED" | "CANCELLED";
export type NotificationType =
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "REMINDER";

export interface User {
  id: string;
  email: string;
  name: string;
  department?: string;
  role: Role;
}

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  capacity: number;
  address: string;
  floor: number;
  equipment: string[];
  photoUrl?: string;
  status: RoomStatus;
  createdAt: string;
  _count?: { bookings: number };
  // Ближайшие брони (в детальном просмотре)
  bookings?: Array<{ id: string; startTime: string; endTime: string }>;
}

export interface Booking {
  id: string;
  userId: string;
  roomId: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  createdAt: string;
  room?: Pick<Room, "id" | "name" | "type" | "address" | "floor">;
  user?: Pick<User, "id" | "name" | "email" | "department">;
}

export interface Notification {
  id: string;
  userId: string;
  bookingId?: string;
  type: NotificationType;
  message: string;
  isRead: boolean;
  createdAt: string;
  booking?: {
    id: string;
    startTime: string;
    endTime: string;
    room: { name: string };
  };
}

// Стандартный ответ со списком и пагинацией
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    unreadCount?: number; // только для уведомлений
  };
}

// Стандартный формат ошибки от бэкенда
export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
}

// src/types/index.ts — добавляем новые типы в конец файла

// Расписание помещения
export interface RoomSchedule {
  id: string | null;
  roomId: string;
  dayOfWeek: number; // 0=вс, 1=пн ... 6=сб
  isOpen: boolean;
  openTime: string; // "09:00"
  closeTime: string; // "18:00"
}

// Заблокированный слот
export interface RoomBlockedSlot {
  id: string;
  roomId: string;
  startTime: string;
  endTime: string;
  reason?: string;
  createdAt: string;
}

// Связь владения помещением
export interface RoomOwnership {
  id: string;
  userId: string;
  roomId: string;
  user: Pick<User, "id" | "name" | "email" | "department">;
  createdAt: string;
}

// Аналитика помещения (для владельца)
export interface RoomAnalytics {
  period: { from: string; to: string };
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  upcomingBookings: number;
  cancellationRate: number;
}
