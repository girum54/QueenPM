import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { DRIZZLE } from '../database/database.provider';
import { db as DbType } from '../db/db';
import * as schema from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

@Injectable()
export class CallsService {
  private readonly logger = new Logger(CallsService.name);
  private readonly livekitUrl: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(
    private config: ConfigService,
    @Inject(DRIZZLE) private db: typeof DbType,
  ) {
    this.livekitUrl = this.config.get<string>('LIVEKIT_URL', 'ws://localhost:7880');
    this.apiKey = this.config.get<string>('LIVEKIT_API_KEY', 'devkey');
    this.apiSecret = this.config.get<string>('LIVEKIT_API_SECRET', 'secret');
  }

  private getRoomService(): RoomServiceClient {
    const httpUrl = this.livekitUrl
      .replace('ws://', 'http://')
      .replace('wss://', 'https://');
    return new RoomServiceClient(httpUrl, this.apiKey, this.apiSecret);
  }

  // ── Call Lifecycle ─────────────────────────────────────────────────────────────

  async createCall(
    projectId: string,
    createdBy: string,
    callType: 'open' | 'invite_only' = 'open',
  ): Promise<typeof schema.calls.$inferSelect> {
    const roomName = `call-${projectId}`;
    
    // Check if there's already an active call for this project
    const existingCall = await this.getActiveCallForProject(projectId);
    if (existingCall) {
      return existingCall;
    }

    const [call] = await this.db
      .insert(schema.calls)
      .values({
        projectId,
        roomName,
        createdBy,
        callType,
        status: 'active',
      })
      .returning();

    this.logger.log(`Created call ${call.id} for project ${projectId}`);
    return call;
  }

  async getActiveCallForProject(projectId: string): Promise<typeof schema.calls.$inferSelect | null> {
    const [call] = await this.db
      .select()
      .from(schema.calls)
      .where(
        and(
          eq(schema.calls.projectId, projectId),
          eq(schema.calls.status, 'active'),
        ),
      )
      .orderBy(desc(schema.calls.startedAt))
      .limit(1);

    return call || null;
  }

  async getCallById(callId: string): Promise<typeof schema.calls.$inferSelect | null> {
    const [call] = await this.db
      .select()
      .from(schema.calls)
      .where(eq(schema.calls.id, callId))
      .limit(1);

    return call || null;
  }

  async endCall(callId: string): Promise<void> {
    await this.db
      .update(schema.calls)
      .set({ status: 'ended', endedAt: new Date() })
      .where(eq(schema.calls.id, callId));

    this.logger.log(`Ended call ${callId}`);
  }

  // ── Participants ───────────────────────────────────────────────────────────────

  async joinCall(callId: string, userId: string): Promise<typeof schema.callParticipants.$inferSelect> {
    const [participant] = await this.db
      .insert(schema.callParticipants)
      .values({
        callId,
        userId,
        joinedAt: new Date(),
      })
      .returning();

    this.logger.log(`User ${userId} joined call ${callId}`);
    return participant;
  }

  async leaveCall(callId: string, userId: string): Promise<void> {
    await this.db
      .update(schema.callParticipants)
      .set({ leftAt: new Date() })
      .where(
        and(
          eq(schema.callParticipants.callId, callId),
          eq(schema.callParticipants.userId, userId),
        ),
      );

    this.logger.log(`User ${userId} left call ${callId}`);
  }

  async getCallParticipants(callId: string): Promise<typeof schema.callParticipants.$inferSelect[]> {
    return this.db
      .select()
      .from(schema.callParticipants)
      .where(
        and(
          eq(schema.callParticipants.callId, callId),
          eq(schema.callParticipants.leftAt, null as any), // Still in call
        ),
      );
  }

  async isUserInCall(callId: string, userId: string): Promise<boolean> {
    const [participant] = await this.db
      .select()
      .from(schema.callParticipants)
      .where(
        and(
          eq(schema.callParticipants.callId, callId),
          eq(schema.callParticipants.userId, userId),
          eq(schema.callParticipants.leftAt, null as any),
        ),
      )
      .limit(1);

    return !!participant;
  }

  // ── Invites ───────────────────────────────────────────────────────────────────

  async inviteUser(
    callId: string,
    invitedUserId: string,
    invitedBy: string,
  ): Promise<typeof schema.callInvites.$inferSelect> {
    const [invite] = await this.db
      .insert(schema.callInvites)
      .values({
        callId,
        invitedUserId,
        invitedBy,
        status: 'pending',
      })
      .returning();

    this.logger.log(`User ${invitedBy} invited ${invitedUserId} to call ${callId}`);
    return invite;
  }

  async respondToInvite(
    inviteId: string,
    status: 'accepted' | 'declined',
  ): Promise<void> {
    await this.db
      .update(schema.callInvites)
      .set({ status })
      .where(eq(schema.callInvites.id, inviteId));
  }

  async getUserInvites(userId: string): Promise<typeof schema.callInvites.$inferSelect[]> {
    return this.db
      .select()
      .from(schema.callInvites)
      .where(eq(schema.callInvites.invitedUserId, userId));
  }

  async isUserInvited(callId: string, userId: string): Promise<boolean> {
    const [invite] = await this.db
      .select()
      .from(schema.callInvites)
      .where(
        and(
          eq(schema.callInvites.callId, callId),
          eq(schema.callInvites.invitedUserId, userId),
          eq(schema.callInvites.status, 'pending'),
        ),
      )
      .limit(1);

    return !!invite;
  }

  // ── LiveKit Token Generation ─────────────────────────────────────────────────────

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
      const calls = await this.db
        .select()
        .from(schema.calls)
        .where(eq(schema.calls.status, 'active'));

      const result = [];
      for (const call of calls) {
        const participants = await this.getCallParticipants(call.id);
        result.push({
          id: call.id,
          roomName: call.roomName,
          projectId: call.projectId,
          callType: call.callType,
          startedAt: call.startedAt,
          participants: participants.map((p) => ({
            userId: p.userId,
            joinedAt: p.joinedAt,
          })),
        });
      }
      return result;
    } catch (err) {
      this.logger.error('[Calls] getActiveCalls failed:', err);
      return [];
    }
  }

  getLivekitUrl(): string {
    return this.livekitUrl;
  }
}
