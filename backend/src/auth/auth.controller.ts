import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SignUpDto, SignInDto } from './dto/auth.dto';
import { Public } from './public.decorator';
import { CurrentUser } from './current-user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiCookieAuth } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── POST /auth/sign-up ──────────────────────────────────────────────────
  @Public()
  @Post('sign-up')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiBody({ type: SignUpDto })
  @ApiResponse({ status: 201, description: 'User account created successfully' })
  @ApiResponse({ status: 409, description: 'User email or username already exists' })
  async signUp(@Body() dto: SignUpDto, @Res() res: Response) {
    const betterAuthResponse = await this.authService.signUp(dto);

    // Forward all Set-Cookie headers from Better Auth to the client
    const cookies = betterAuthResponse.headers.getSetCookie?.() ?? [];
    if (cookies.length > 0) {
      res.setHeader('set-cookie', cookies);
    }

    const data = await betterAuthResponse.json();
    return res.status(HttpStatus.CREATED).json({
      message: 'Account created successfully',
      user: data.user ?? data,
    });
  }

  // ─── POST /auth/sign-in ──────────────────────────────────────────────────
  @Public()
  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Sign in to an existing account' })
  @ApiBody({ type: SignInDto })
  @ApiResponse({ status: 200, description: 'Signed in successfully' })
  @ApiResponse({ status: 401, description: 'Invalid email or password credentials' })
  async signIn(@Body() dto: SignInDto, @Res() res: Response) {
    const betterAuthResponse = await this.authService.signIn(dto);

    // Forward all Set-Cookie headers so the session cookie is set on the client
    const cookies = betterAuthResponse.headers.getSetCookie?.() ?? [];
    if (cookies.length > 0) {
      res.setHeader('set-cookie', cookies);
    }

    const data = await betterAuthResponse.json();
    return res.status(HttpStatus.OK).json({
      message: 'Signed in successfully',
      user: data.user ?? data,
      session: data.token ? { token: data.token } : null,
    });
  }

  // ─── POST /auth/sign-out ─────────────────────────────────────────────────
  @ApiCookieAuth()
  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign out the active session' })
  @ApiResponse({ status: 200, description: 'Signed out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized context' })
  async signOut(@Req() req: Request, @Res() res: Response) {
    const betterAuthResponse = await this.authService.signOut(req.headers);

    // Clear session cookie by forwarding Better Auth's Set-Cookie header
    const cookies = betterAuthResponse.headers.getSetCookie?.() ?? [];
    if (cookies.length > 0) {
      res.setHeader('set-cookie', cookies);
    }

    return res.status(HttpStatus.OK).json({ message: 'Signed out successfully' });
  }

  // ─── GET /auth/session ───────────────────────────────────────────────────
  @ApiCookieAuth()
  @Get('session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve details of the current active session' })
  @ApiResponse({ status: 200, description: 'Session retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized context' })
  async getSession(@Req() req: Request) {
    return this.authService.getSession(req.headers);
  }

  // ─── GET /auth/me ────────────────────────────────────────────────────────
  // Convenience: returns the currently authenticated user (requires valid session)
  @ApiCookieAuth()
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user profile session metadata via custom decorator' })
  @ApiResponse({ status: 200, description: 'Logged in user retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized context' })
  getMe(@CurrentUser() user: any) {
    return { user };
  }
}

