import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(client: Socket, room: string) {
    client.join(room);
    console.log(`Client ${client.id} joined room: ${room}`);
  }

  emitOrderCreated(order: any) {
    this.server.to('kitchen').emit('order:created', order);
    this.server.to('pos').emit('order:created', order);
    if (order.id) {
      this.server.to(`order:${order.id}`).emit('order:created', order);
    }
  }

  emitOrderStatusChanged(order: any) {
    this.server.to('kitchen').emit('order:status_changed', order);
    this.server.to('pos').emit('order:status_changed', order);
    if (order.id) {
      this.server.to(`order:${order.id}`).emit('order:status_changed', order);
    }
  }

  emitVitrinaUpdated(data: any) {
    this.server.to('pos').emit('vitrina:updated', data);
    this.server.to('kitchen').emit('vitrina:updated', data);
  }

  emitProductionUpdated(data: any) {
    this.server.to('kitchen').emit('production:updated', data);
    this.server.to('pos').emit('production:updated', data);
  }
}
