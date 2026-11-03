import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { AuditService } from './audit.service';
import { ListUsersQueryDto } from './dto/admin-user.dto';
import { CreateStaffDto } from './dto/staff.dto';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly audit: AuditService,
  ) {}

  async listUsers(query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search?.trim();

    const where = {
      isDeleted: false,
      ...(query.role ? { role: query.role } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    };

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: users.map((u) => ({
        ...this.authService.toSafeUser(u),
        isActive: u.isActive,
        createdAt: u.createdAt,
      })),
      message: 'Users fetched',
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, isDeleted: false },
    });
    if (!user) throw new NotFoundException('User not found');
    return {
      data: {
        ...this.authService.toSafeUser(user),
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
      message: 'User fetched',
    };
  }

  async updateUserStatus(
    userId: string,
    isActive: boolean,
    actor: { id: string; ip?: string },
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, isDeleted: false },
    });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });

    await this.audit.log({
      adminId: actor.id,
      action: isActive ? 'user.unblock' : 'user.block',
      entity: 'User',
      entityId: userId,
      metadata: { email: user.email },
      ipAddress: actor.ip,
    });

    return {
      data: {
        ...this.authService.toSafeUser(updated),
        isActive: updated.isActive,
      },
      message: isActive ? 'User unblocked' : 'User blocked',
    };
  }

  // ---------------------------------- staff ----------------------------------

  async listStaff() {
    const staff = await this.prisma.user.findMany({
      where: { isDeleted: false, role: { in: ['staff', 'admin'] } },
      orderBy: { createdAt: 'desc' },
    });
    return {
      data: staff.map((s) => ({
        ...this.authService.toSafeUser(s),
        isActive: s.isActive,
        createdAt: s.createdAt,
      })),
      message: 'Staff fetched',
    };
  }

  async createStaff(dto: CreateStaffDto, actor: { id: string; ip?: string }) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email is already registered');

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email,
        passwordHash: await bcrypt.hash(dto.password, SALT_ROUNDS),
        role: dto.role ?? 'staff',
        isVerified: true,
      },
    });

    await this.audit.log({
      adminId: actor.id,
      action: 'staff.create',
      entity: 'User',
      entityId: user.id,
      metadata: { email, role: user.role },
      ipAddress: actor.ip,
    });

    return {
      data: this.authService.toSafeUser(user),
      message: 'Staff account created',
    };
  }

  async updateStaffRoles(
    staffId: string,
    role: 'customer' | 'staff' | 'admin',
    actor: { id: string; ip?: string },
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: staffId, isDeleted: false },
    });
    if (!user) throw new NotFoundException('Staff account not found');
    if (user.id === actor.id && role !== 'admin') {
      throw new ConflictException('You cannot demote your own account');
    }

    const updated = await this.prisma.user.update({
      where: { id: staffId },
      data: { role },
    });

    await this.audit.log({
      adminId: actor.id,
      action: 'staff.role.update',
      entity: 'User',
      entityId: staffId,
      metadata: { from: user.role, to: role, email: user.email },
      ipAddress: actor.ip,
    });

    return {
      data: this.authService.toSafeUser(updated),
      message: 'Role updated',
    };
  }
}
