/**
 * =============================================================================
 * AUTH MODULE
 * =============================================================================
 * 
 * NestJS module for authentication.
 * Configures JWT, Passport strategies, and provides auth services.
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { DatabaseModule } from '@lib/database';
import { RbacModule } from '../agent-system/rbac.module';

@Module({
  imports: [
    // Database access for user/tenant repositories
    DatabaseModule.forFeature(),

    // Passport for authentication strategies
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JWT configuration
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('auth.jwtSecret', 'analytics-jwt-secret-dev'),
        signOptions: {
          expiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
        },
      }),
      inject: [ConfigService],
    }),
    RbacModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtStrategy],
})
export class AuthModule {}
