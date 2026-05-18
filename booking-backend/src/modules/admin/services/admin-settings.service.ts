import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';

const BUSINESS_HOURS_KEY = 'business_hours';

const DEFAULT_BUSINESS_HOURS = {
  timezone: 'Asia/Shanghai',
  monday: [{ open: '09:00', close: '17:00' }],
  tuesday: [{ open: '09:00', close: '17:00' }],
  wednesday: [{ open: '09:00', close: '17:00' }],
  thursday: [{ open: '09:00', close: '17:00' }],
  friday: [{ open: '09:00', close: '17:00' }],
  saturday: [{ open: '10:00', close: '14:00' }],
  sunday: [],
};

export interface BusinessHour {
  open: string;
  close: string;
}

export interface BusinessHoursDto {
  timezone: string;
  monday: BusinessHour[];
  tuesday: BusinessHour[];
  wednesday: BusinessHour[];
  thursday: BusinessHour[];
  friday: BusinessHour[];
  saturday: BusinessHour[];
  sunday: BusinessHour[];
  updatedAt: string;
}

@Injectable()
export class AdminSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getBusinessHours(): Promise<BusinessHoursDto> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { settingKey: BUSINESS_HOURS_KEY },
    });

    if (!setting) {
      return {
        ...DEFAULT_BUSINESS_HOURS,
        updatedAt: new Date().toISOString(),
      } as BusinessHoursDto;
    }

    const value = JSON.parse(setting.settingValue);
    return {
      ...DEFAULT_BUSINESS_HOURS,
      ...value,
      updatedAt: setting.updatedAt.toISOString(),
    } as BusinessHoursDto;
  }

  async updateBusinessHours(
    data: Omit<BusinessHoursDto, 'updatedAt'>,
  ): Promise<{ message: string }> {
    await this.prisma.systemSetting.upsert({
      where: { settingKey: BUSINESS_HOURS_KEY },
      create: {
        settingKey: BUSINESS_HOURS_KEY,
        settingValue: JSON.stringify(data),
        settingType: 'JSON',
        category: 'BUSINESS',
      },
      update: {
        settingValue: JSON.stringify(data),
      },
    });

    return { message: '营业时间已更新' };
  }
}
