import { Module } from '@nestjs/common';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { RoomOwnerController } from 'src/rooms/room-owner-controller';
import { RoomOwnerService } from './room-owner.service';
import { RoomOwnerGuard } from '../common/guards/room-owner.guard';

@Module({
  controllers: [RoomsController, RoomOwnerController],
  providers: [RoomsService, RoomOwnerService, RoomOwnerGuard],
  exports: [RoomsService],
})
export class RoomsModule {}
