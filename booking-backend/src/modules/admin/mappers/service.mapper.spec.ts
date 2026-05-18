import {
  fromCreateAdminServiceDto,
  fromUpdateAdminServiceDto,
  toAdminServiceDto,
} from './service.mapper';
import { CreateAdminServiceDto, UpdateAdminServiceDto } from '../dto/admin-service.dto';

describe('service.mapper', () => {
  describe('fromCreateAdminServiceDto', () => {
    it('should convert taxRate from percentage to decimal', () => {
      const dto: CreateAdminServiceDto = {
        name: 'Massage',
        description: 'Relaxing massage',
        duration: 60,
        price: 120,
        active: true,
        imageUrl: '/img.jpg',
        pricePerMinute: 2.0,
        taxRate: 10, // 10% — frontend sends whole number
        category: 'Therapy',
      };

      const result = fromCreateAdminServiceDto(dto);

      expect(result).toEqual({
        name: 'Massage',
        description: 'Relaxing massage',
        durationMinutes: 60,
        price: 120,
        pricePerMinute: 2.0,
        isActive: true,
        imageUrl: '/img.jpg',
        taxRate: 0.1, // DB stores decimal: 10% / 100 = 0.1
        category: 'Therapy',
      });
    });

    it('should keep taxRate undefined when not provided', () => {
      const dto: CreateAdminServiceDto = {
        name: 'Basic Service',
        duration: 30,
        price: 50,
      };

      const result = fromCreateAdminServiceDto(dto);

      expect(result.name).toBe('Basic Service');
      expect(result.description).toBeUndefined();
      expect(result.imageUrl).toBeUndefined();
      expect(result.pricePerMinute).toBeUndefined();
      expect(result.taxRate).toBeUndefined();
      expect(result.category).toBeUndefined();
    });

    it('should handle taxRate of 0 correctly', () => {
      const dto: CreateAdminServiceDto = {
        name: 'Free Tax Service',
        duration: 30,
        price: 100,
        taxRate: 0, // 0% tax
      };

      const result = fromCreateAdminServiceDto(dto);

      // 0 / 100 = 0
      expect(result.taxRate).toBe(0);
    });
  });

  describe('fromUpdateAdminServiceDto', () => {
    it('should convert taxRate from percentage to decimal', () => {
      const dto: UpdateAdminServiceDto = {
        name: 'Service',
        description: 'Updated desc',
        duration: 45,
        price: 100,
        taxRate: 8, // 8% — frontend sends whole number
        category: 'Premium',
      };

      const result = fromUpdateAdminServiceDto(dto);

      expect(result.name).toBe('Service');
      expect(result.description).toBe('Updated desc');
      expect(result.durationMinutes).toBe(45);
      expect(result.price).toBe(100);
      expect(result.taxRate).toBe(0.08); // DB stores decimal: 8% / 100 = 0.08
      expect(result.category).toBe('Premium');
    });

    it('should omit taxRate when not provided', () => {
      const dto: UpdateAdminServiceDto = {
        name: 'Just Name Update',
      };

      const result = fromUpdateAdminServiceDto(dto);

      expect(result.name).toBe('Just Name Update');
      expect(result).not.toHaveProperty('taxRate');
    });

    it('should handle category alongside taxRate', () => {
      const dto: UpdateAdminServiceDto = {
        name: 'Updated Massage',
        category: 'Wellness',
        taxRate: 12, // 12%
      };

      const result = fromUpdateAdminServiceDto(dto);

      expect(result.name).toBe('Updated Massage');
      expect(result.category).toBe('Wellness');
      expect(result.taxRate).toBe(0.12); // 12 / 100 = 0.12
    });
  });

  describe('toAdminServiceDto', () => {
    it('should convert pricePerMinute from Prisma Decimal string to number', () => {
      // Prisma Decimal.toJSON() returns a string, e.g., new Decimal('8.33') → JSON.stringify → '"8.33"'
      // The mapper must explicitly convert to Number to prevent frontend TypeError on .toFixed()
      const prismaService = {
        id: 'def-456',
        name: 'Dynamic Pricing',
        description: 'Pay per minute',
        durationMinutes: 60,
        price: 100,
        pricePerMinute: '8.33', // Prisma Decimal serializes as string
        taxRate: 0.08,
        isActive: true,
        createdAt: new Date('2026-01-01'),
        imageUrl: null,
        category: { name: 'Therapy' },
      };

      const result = toAdminServiceDto(prismaService as any);

      expect(result.pricePerMinute).toBe(8.33);
      expect(typeof result.pricePerMinute).toBe('number');
    });

    it('should convert taxRate from decimal to percentage', () => {
      const prismaService = {
        id: 'abc-123',
        name: 'Massage',
        description: 'Relaxing massage',
        durationMinutes: 60,
        price: 120,
        pricePerMinute: 2.0,
        taxRate: 0.1, // DB stores decimal
        isActive: true,
        createdAt: new Date('2026-01-01'),
        imageUrl: '/img.jpg',
        category: { name: 'Therapy' },
      };

      const result = toAdminServiceDto(prismaService as any);

      expect(result.taxRate).toBe(10); // API returns percentage: 0.1 * 100 = 10
    });

    it('should return undefined taxRate when DB value is null', () => {
      const prismaService = {
        id: 'abc-123',
        name: 'Basic Service',
        description: 'Simple service',
        durationMinutes: 30,
        price: 50,
        pricePerMinute: null,
        taxRate: null,
        isActive: true,
        createdAt: new Date('2026-01-01'),
        imageUrl: null,
        category: null,
      };

      const result = toAdminServiceDto(prismaService as any);

      expect(result.taxRate).toBeUndefined();
    });

    it('should return 0 for pricePerMinute when DB value is 0 (not undefined)', () => {
      const prismaService = {
        id: 'abc-123',
        name: 'Zero PPM Service',
        description: 'Service with 0 price per minute',
        durationMinutes: 30,
        price: 0,
        pricePerMinute: '0', // Prisma Decimal 0 serializes as string '0'
        taxRate: 0.08,
        isActive: true,
        createdAt: new Date('2026-01-01'),
        imageUrl: null,
        category: null,
      };

      const result = toAdminServiceDto(prismaService as any);

      // pricePerMinute=0 should be 0, NOT undefined (falsy check bug)
      expect(result.pricePerMinute).toBe(0);
      expect(typeof result.pricePerMinute).toBe('number');
    });

    it('should return 0 for taxRate when DB value is 0', () => {
      const prismaService = {
        id: 'abc-123',
        name: 'Zero Tax Service',
        description: 'Service with 0% tax',
        durationMinutes: 30,
        price: 100,
        pricePerMinute: null,
        taxRate: 0, // DB stores 0 (0% tax)
        isActive: true,
        createdAt: new Date('2026-01-01'),
        imageUrl: null,
        category: null,
      };

      const result = toAdminServiceDto(prismaService as any);

      // taxRate=0 should be 0 (0 * 100 = 0), NOT undefined
      expect(result.taxRate).toBe(0);
      expect(typeof result.taxRate).toBe('number');
    });

    it('should return undefined taxRate when DB value is undefined', () => {
      const prismaService = {
        id: 'abc-123',
        name: 'No Tax Service',
        description: 'Service without tax',
        durationMinutes: 30,
        price: 50,
        pricePerMinute: null,
        isActive: true,
        createdAt: new Date('2026-01-01'),
        imageUrl: null,
        category: null,
      };

      // taxRate not set at all
      const result = toAdminServiceDto(prismaService as any);

      expect(result.taxRate).toBeUndefined();
    });
  });
});
