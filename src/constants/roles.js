/**
 * User Role Constants
 * Centralized role definitions to prevent magic strings
 */

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  USER: 'user',
  CUSTOMER: 'customer', // Alias for user
  SELLER: 'seller'
};

// Backward compatibility
export const USER_ROLES = ROLES;

// Admin roles that have elevated privileges
export const ADMIN_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN
];

// All valid roles
export const ALL_ROLES = Object.values(ROLES);

/**
 * Check if user has required role
 * @param {string} userRole - User's current role
 * @param {string|string[]} allowedRoles - Required role(s)
 * @returns {boolean}
 */
export const hasRole = (userRole, allowedRoles) => {
  if (!userRole) return false;

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return roles.includes(userRole);
};

/**
 * Check if user is admin (any level)
 * @param {string} userRole - User's current role
 * @returns {boolean}
 */
export const isAdmin = (userRole) => {
  return ADMIN_ROLES.includes(userRole);
};

/**
 * Check if user is super admin
 * @param {string} userRole - User's current role
 * @returns {boolean}
 */
export const isSuperAdmin = (userRole) => {
  return userRole === ROLES.SUPER_ADMIN;
};

/**
 * Check if user is regular user (not admin)
 * @param {string} userRole - User's current role
 * @returns {boolean}
 */
export const isRegularUser = (userRole) => {
  return userRole === ROLES.USER || userRole === ROLES.CUSTOMER;
};

/**
 * Get role display name
 * @param {string} role - Role identifier
 * @returns {string} Human-readable role name
 */
export const getRoleDisplayName = (role) => {
  const names = {
    [ROLES.SUPER_ADMIN]: 'Super Administrator',
    [ROLES.ADMIN]: 'Administrator',
    [ROLES.USER]: 'User',
    [ROLES.CUSTOMER]: 'Customer',
    [ROLES.SELLER]: 'Seller'
  };

  return names[role] || 'Unknown Role';
};

/**
 * Validate if role is valid
 * @param {string} role - Role to validate
 * @returns {boolean}
 */
export const isValidRole = (role) => {
  return ALL_ROLES.includes(role);
};

