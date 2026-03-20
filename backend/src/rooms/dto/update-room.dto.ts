// src/rooms/dto/update-room.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateRoomDto } from './create-room.dto';

// PartialType делает все поля необязательными — идеально для PATCH
// При этом сохраняет все валидаторы и Swagger-декораторы из CreateRoomDto
export class UpdateRoomDto extends PartialType(CreateRoomDto) {}
