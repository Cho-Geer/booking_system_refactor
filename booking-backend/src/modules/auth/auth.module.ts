import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule } from "@nestjs/config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";
import { EmailModule } from "../email/email.module";
import { VerificationModule } from "../verification/verification.module";
import { EncryptionModule } from "../encryption/encryption.module";
import { loadJwtSecret } from "../../config/jwt.config";

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: () => {
        const secret = loadJwtSecret();
        return {
          global: true,
          secret,
          signOptions: { expiresIn: 900 },
        };
      },
    }),
    EmailModule,
    VerificationModule,
    EncryptionModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
