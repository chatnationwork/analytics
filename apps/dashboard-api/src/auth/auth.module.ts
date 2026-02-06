/**
 * =============================================================================
 * AUTH MODULE
 * =============================================================================
 *
 * NestJS module for authentication.
 * Configures JWT, Passport strategies, and provides auth services.
 */

import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";
import { TwoFactorEnforcementInterceptor } from "./two-factor-enforcement.interceptor";
import { DatabaseModule } from "@lib/database";
import { TwoFaVerificationEntity } from "@lib/database/entities/two-fa-verification.entity";
import { RbacModule } from "../agent-system/rbac.module";
import { AuditModule } from "../audit/audit.module";
import { AgentSystemModule } from "../agent-system/agent-system.module";
import { WhatsappModule } from "../whatsapp/whatsapp.module";

@Module({
  imports: [
    AuditModule,
    AgentSystemModule,
    WhatsappModule,
    DatabaseModule.forFeature(),
    TypeOrmModule.forFeature([TwoFaVerificationEntity]),

    PassportModule.register({ defaultStrategy: "jwt" }),

    // JWT configuration
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>(
          "auth.jwtSecret",
          "analytics-jwt-secret-dev",
        ),
        signOptions: {
          expiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
        },
      }),
      inject: [ConfigService],
    }),
    RbacModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: APP_INTERCEPTOR,
      useClass: TwoFactorEnforcementInterceptor,
    },
  ],
  exports: [AuthService, JwtStrategy],
})
export class AuthModule {}
