/**
 * Authentication Middleware for Analytics Module
 * 
 * Provides authentication and authorization helpers for analytics functions.
 */

import { CallableRequest } from 'firebase-functions/v2/https';
import { PermissionsService } from '@cvplus/auth';
import { AuthConfig } from '@cvplus/auth';

// Default auth config for analytics module
const authConfig: AuthConfig = {
  enableEmailVerification: true,
  enableMFA: true,
  sessionTimeout: 3600000, // 1 hour
  allowAnonymous: false,
  enableRateLimiting: true,
  rateLimitOptions: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },
  security: {
    enforcePasswordPolicy: true,
    minPasswordLength: 8,
    requireSpecialCharacters: true,
    preventPasswordReuse: 5,
    enableAuditLogging: true
  }
};

const permissionsService = new PermissionsService(authConfig);

/**
 * Middleware to require authentication
 */
export async function requireAuth<T = any>(request: CallableRequest<T>): Promise<CallableRequest<T>> {
  if (!request.auth) {
    throw new Error('Authentication required');
  }
  
  if (!request.auth.uid) {
    throw new Error('Valid authentication required');
  }

  return request;
}

/**
 * Check if user has admin privileges
 */
export function isAdmin<T = any>(request: CallableRequest<T>): boolean {
  if (!request.auth || !request.auth.token) {
    return false;
  }

  // Check for admin role in custom claims
  const customClaims = request.auth.token;
  
  // Check for admin role
  if (customClaims.role === 'admin' || customClaims.admin === true) {
    return true;
  }

  // Check for admin permissions
  if (customClaims.permissions && Array.isArray(customClaims.permissions)) {
    return customClaims.permissions.includes('admin') || 
           customClaims.permissions.includes('analytics:admin');
  }

  return false;
}

/**
 * Check if user has specific permission
 */
export function hasPermission<T = any>(request: CallableRequest<T>, permission: string): boolean {
  if (!request.auth || !request.auth.token) {
    return false;
  }

  const customClaims = request.auth.token;
  
  // Admin users have all permissions
  if (isAdmin(request)) {
    return true;
  }

  // Check specific permissions
  if (customClaims.permissions && Array.isArray(customClaims.permissions)) {
    return customClaims.permissions.includes(permission);
  }

  return false;
}

/**
 * Require specific role
 */
export async function requireRole<T = any>(
  request: CallableRequest<T>, 
  role: string
): Promise<CallableRequest<T>> {
  const authenticatedRequest = await requireAuth(request);
  
  const customClaims = authenticatedRequest.auth?.token;
  if (!customClaims || customClaims.role !== role) {
    throw new Error(`Role '${role}' required`);
  }

  return authenticatedRequest;
}

/**
 * Require any of the specified roles
 */
export async function requireAnyRole<T = any>(
  request: CallableRequest<T>, 
  roles: string[]
): Promise<CallableRequest<T>> {
  const authenticatedRequest = await requireAuth(request);
  
  const customClaims = authenticatedRequest.auth?.token;
  if (!customClaims || !roles.includes(customClaims.role)) {
    throw new Error(`One of roles [${roles.join(', ')}] required`);
  }

  return authenticatedRequest;
}