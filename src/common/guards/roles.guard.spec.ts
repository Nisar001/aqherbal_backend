import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const makeContext = (user?: { role: string }) =>
    ({
      getHandler: () => jest.fn(),
      getClass: () => class TestController {},
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as any;

  const reflectorWithRoles = (roles: string[] | undefined) =>
    ({
      getAllAndOverride: jest.fn().mockReturnValue(roles),
    }) as unknown as Reflector;

  it('allows requests without @Roles for any authenticated user', () => {
    const guard = new RolesGuard(reflectorWithRoles(undefined));
    expect(guard.canActivate(makeContext({ role: 'customer' }))).toBe(true);
  });

  it('allows a user whose role is in the allowed list', () => {
    const guard = new RolesGuard(reflectorWithRoles(['admin']));
    expect(guard.canActivate(makeContext({ role: 'admin' }))).toBe(true);
  });

  it('rejects a customer hitting an admin route', () => {
    const guard = new RolesGuard(reflectorWithRoles(['admin']));
    expect(guard.canActivate(makeContext({ role: 'customer' }))).toBe(false);
  });

  it('rejects anonymous requests when @Roles is set', () => {
    const guard = new RolesGuard(reflectorWithRoles(['admin']));
    expect(guard.canActivate(makeContext(undefined))).toBe(false);
  });
});
