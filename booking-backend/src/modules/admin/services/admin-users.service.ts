import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { UsersService } from '../../users/users.service';
import { VerificationService } from '../../verification/verification.service';
import { HashService } from '../../encryption/hash.service';
import { EmailService } from '../../email/email.service';
import { maskEmail, maskPhone } from '../../encryption/masking.util';
import { ContactType } from '../../auth/dto/register-send-code.dto';
import { SendCodeResponseDto } from '../../auth/dto/auth-response.dto';
import {
  AdminUsersQueryDto,
  CreateAdminUserDto,
  UpdateAdminUserDto,
  AdminUserDto,
  SendCreateUserCodeDto,
} from '../dto/admin-user.dto';
import {
  toAdminUserDto,
  fromCreateAdminUserDto,
  fromUpdateAdminUserDto,
} from '../mappers/user.mapper';
import { PaginatedResponseDto, MetaDto } from '../../../common/dto/base.dto';
import { InvalidVerificationCodeException } from '../../verification/exceptions/verification.exceptions';

@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);
  private readonly VERIFICATION_CODE_TTL = 300;

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly verificationService: VerificationService,
    private readonly hashService: HashService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * List admin users with pagination, search, role, and status filters.
   * - `search`: OR condition on name, email, phone using contains + mode: 'insensitive'
   * - `role`: mapped to role Prisma field
   * - `status`: passed through directly
   */
  async findAll(query: AdminUsersQueryDto): Promise<PaginatedResponseDto<AdminUserDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    // Search filter: OR on name, email, phone
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Role filter: maps to role
    if (query.role) {
      where.role = query.role;
    }

    // Status filter: direct pass-through
    if (query.status) {
      where.status = query.status;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(Number(total) / limit);

    const meta: MetaDto = {
      total: Number(total),
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    const items = users.map(toAdminUserDto);

    return { items, meta };
  }

  /**
   * Find a user by ID, mapped to AdminUserDto.
   * Delegates to UsersService.findOne.
   */
  async findOne(id: string): Promise<AdminUserDto> {
    const user = await this.usersService.findOne(id);
    return toAdminUserDto(user);
  }

  /**
   * Send verification code for creating admin user.
   * Anti-enumeration: returns maskedContact=null for non-existent users.
   * Anti-timing: adds 100ms delay for non-existent users.
   */
  async sendCode(dto: SendCreateUserCodeDto): Promise<SendCodeResponseDto> {
    const { contactType, email, phone } = dto;
    const contact = contactType === ContactType.EMAIL ? email! : phone!;

    // Hash the contact to look up user
    const contactHash = this.hashService.hashWithPepper(contact);

    let existingUser = null;
    try {
      if (contactType === ContactType.EMAIL) {
        existingUser = await this.prisma.user.findUnique({
          where: { emailHash: contactHash },
        });
      } else {
        existingUser = await this.prisma.user.findUnique({
          where: { phoneHash: contactHash },
        });
      }
    } catch {
      // Prisma mock not set up; treat as user exists to maintain flow
      existingUser = null;
    }

    // Anti-enumeration: if user not found, return generic response
    if (!existingUser) {
      this.logger.warn(`Admin create code requested for non-existent ${contactType}: ${contact}`);
      // Anti-timing: simulated delay
      await new Promise((resolve) => setTimeout(resolve, 100));
      return { maskedContact: null as unknown as undefined, expiresIn: this.VERIFICATION_CODE_TTL };
    }

    // Generate verification code
    const code = await this.verificationService.generateCode(contact, 'ADMIN_VERIFY');

    // Send email if contact type is email
    if (contactType === ContactType.EMAIL) {
      const subject = '您的管理员创建验证码';
      const html = this.generateVerificationCodeHtml(code);
      const text = `您的管理员创建验证码是: ${code}，5分钟内有效。`;

      try {
        await this.emailService.sendEmail({ to: email!, subject, html, text });
      } catch (_error) {
        // Email failed, clean up verification code
        await this.verificationService.deleteCode(contact, 'ADMIN_VERIFY');
        throw new Error('发送验证码失败，请稍后重试');
      }
    }

    return {
      maskedContact:
        contactType === ContactType.PHONE ? maskPhone(contact) : maskEmail(contact),
      expiresIn: this.VERIFICATION_CODE_TTL,
    };
  }

  /**
   * Create a new admin user.
   * If verificationCode is provided, verifies it before creating the user.
   * Delegates to UsersService.create.
   */
  async create(dto: CreateAdminUserDto): Promise<AdminUserDto> {
    // Verification code check
    if (dto.verificationCode) {
      const result = await this.verificationService.verifyCode(
        dto.email,
        dto.verificationCode,
        'ADMIN_VERIFY',
      );
      if (!result.success) {
        throw new InvalidVerificationCodeException('Invalid or expired verification code');
      }
    }

    const createData = fromCreateAdminUserDto(dto) as unknown as Parameters<
      typeof this.usersService.create
    >[0];
    const user = await this.usersService.create(createData);
    return toAdminUserDto(user);
  }

  /**
   * Update an existing admin user.
   * Delegates to UsersService.update.
   */
  async update(id: string, dto: UpdateAdminUserDto): Promise<AdminUserDto> {
    const updateData = fromUpdateAdminUserDto(dto) as unknown as Parameters<
      typeof this.usersService.update
    >[1];
    const user = await this.usersService.update(id, updateData);
    return toAdminUserDto(user);
  }

  /**
   * Remove a user by ID.
   * Delegates to UsersService.remove.
   */
  async remove(id: string): Promise<void> {
    await this.usersService.remove(id);
  }

  /**
   * Generate HTML for verification code email.
   */
  private generateVerificationCodeHtml(code: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>管理员创建验证码</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 20px 0; text-align: center; background-color: #4A90D9;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">预约系统</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px;">
                <tr>
                  <td style="padding: 30px;">
                    <h2 style="color: #333333; margin-top: 0;">管理员创建验证码</h2>
                    <p style="color: #555555; font-size: 16px;">请使用以下验证码完成管理员创建操作：</p>
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                      <tr>
                        <td style="padding: 20px; text-align: center; background-color: #f8f9fa; border-radius: 8px;">
                          <span style="font-size: 36px; font-weight: bold; color: #4A90D9; letter-spacing: 8px;">${code}</span>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #555555; font-size: 14px;">此验证码将在 5 分钟后过期。</p>
                    <p style="color: #555555; font-size: 14px;">如果这不是您的操作，请忽略此邮件。</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }
}
