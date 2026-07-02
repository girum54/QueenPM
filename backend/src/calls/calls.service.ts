import { Injectable, Inject } from '@nestjs/common';
import { AccessToken } from 'livekit-server-sdk';
import { DRIZZLE } from '../database/database.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class CallsService {
  private readonly livekitUrl = process.env.LIVEKIT_URL || 'http://localhost:7880';
  private readonly apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
  private readonly apiSecret = process.env.LIVEKIT_API_SECRET || 'secret';

  constructor(@Inject(DRIZZLE) private db: Db) {}

  async generateAccessToken(
    roomName: string,
    userId: string,
    userName: string,
  ): Promise<string> {
    const at = new AccessToken(this.apiKey, this.apiSecret);
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });

    at.identity = userId;
    at.name = userName;

    return at.toJwt();
  }

  getLivekitUrl(): string {
    return this.livekitUrl;
  }
}
