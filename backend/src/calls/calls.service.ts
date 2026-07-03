import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken } from 'livekit-server-sdk';

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
  ): Promise<string> {
    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: userId,
      name: userName,
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

  getLivekitUrl(): string {
    return this.livekitUrl;
  }
}
