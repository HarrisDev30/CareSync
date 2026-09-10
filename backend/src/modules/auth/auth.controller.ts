import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, UnlockSessionDto } from './dto/auth.dto';
import { Public } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditedAction } from '../../common/decorators/audit.decorator';
import { AuditAction } from '../../common/constants/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';

@ApiTags('Authentication & Session')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @AuditedAction({ action: AuditAction.USER_AUTHENTICATED, resource: 'auth' })
  @ApiOperation({ summary: 'Login staff member and establish active session' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto);
    return {
      statusCode: 200,
      message: 'Authentication successful',
      data: result,
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('unlock')
  @HttpCode(HttpStatus.OK)
  @AuditedAction({ action: AuditAction.USER_SESSION_UNLOCKED, resource: 'auth' })
  @ApiOperation({ summary: 'Unlock workstation after 15-minute inactivity timeout' })
  @ApiResponse({ status: 200, description: 'Session successfully unlocked' })
  @ApiResponse({ status: 401, description: 'Incorrect password' })
  async unlock(@CurrentUser() user: User, @Body() dto: UnlockSessionDto) {
    const result = await this.authService.unlock(user, dto);
    return {
      statusCode: 200,
      message: 'Session successfully unlocked',
      data: result,
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @AuditedAction({ action: AuditAction.USER_LOGOUT, resource: 'auth' })
  @ApiOperation({ summary: 'Terminate active session' })
  @ApiResponse({ status: 200, description: 'Session successfully terminated' })
  async logout(@CurrentUser() user: User) {
    await this.authService.logout(user);
    return {
      statusCode: 200,
      message: 'Session successfully terminated',
    };
  }
}

