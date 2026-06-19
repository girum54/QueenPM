import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { auth } from '../auth';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import { SignUpDto } from './dto/auth.dto';
import { SignInDto } from './dto/auth.dto';
import type { IncomingHttpHeaders } from 'http';

@Injectable()
export class AuthService {
  // ─── Sign Up ───────────────────────────────────────────────────────────────
  async signUp(dto: SignUpDto): Promise<Response> {
    const response = await auth.api.signUpEmail({
      body: {
        email: dto.email,
        password: dto.password,
        name: dto.name,
        username: dto.username ?? null,
        color: dto.color ?? 'bg-slate-500',
      },
      asResponse: true,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const message = (body as any)?.message ?? 'Sign-up failed';
      if (response.status === 422 || response.status === 409) {
        throw new ConflictException(message);
      }
      throw new InternalServerErrorException(message);
    }

    return response;
  }

  // ─── Sign In ───────────────────────────────────────────────────────────────
  async signIn(dto: SignInDto): Promise<Response> {
    const response = await auth.api.signInEmail({
      body: {
        email: dto.email,
        password: dto.password,
      },
      asResponse: true,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const message = (body as any)?.message ?? 'Invalid credentials';
      throw new UnauthorizedException(message);
    }

    return response;
  }

  // ─── Sign Out ──────────────────────────────────────────────────────────────
  async signOut(headers: IncomingHttpHeaders): Promise<Response> {
    const response = await auth.api.signOut({
      headers: fromNodeHeaders(headers),
      asResponse: true,
    });

    return response;
  }

  // ─── Get Session ───────────────────────────────────────────────────────────
  async getSession(headers: IncomingHttpHeaders) {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(headers),
    });

    if (!session) {
      throw new UnauthorizedException('No active session');
    }

    return session;
  }
}
