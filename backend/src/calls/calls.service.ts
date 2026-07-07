import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

@Injectable()
export class CallsService {
  private readonly livekitUrl: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(private config: ConfigService) {
    this.livekitUrl = this.config.get<string>('LIVEKIT_URL', 'ws://localhost:7880');
    this.apiKey = this.config.get<string>('LIVEKIT_API_KEY', 'devkey');
    this.apiSecret = this.config.get<string>('LIVEKIT_API_SECRET', 'secret');
  }

  async generateAccessToken(
    roomName: string,
    userId: string,
    userName: string,
    identity?: string,
    name?: string,
  ): Promise<string> {
    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: identity ?? userId,
      name: name ?? userName,
      // Token expires in 6 hours
      ttl: '6h',
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });

    return await at.toJwt();
  }

  async getActiveCalls() {
    try {
      const httpUrl = this.livekitUrl
        .replace('ws://', 'http://')
        .replace('wss://', 'https://');
      const roomService = new RoomServiceClient(httpUrl, this.apiKey, this.apiSecret);
      const rooms = await roomService.listRooms();
      const active = [];
      for (const room of rooms) {
        if (room.numParticipants > 0) {
          const participants = await roomService.listParticipants(room.name);
          active.push({
            roomName: room.name,
            participants: participants.map((p) => ({
              identity: p.identity,
              name: p.name,
            })),
          });
        }
      }
      return active;
    } catch (err) {
      console.error('[LiveKit] listRooms failed:', err);
      return [];
    }
  }

  getLivekitUrl(): string {
    return this.livekitUrl;
  }
}
