import { REGISTERED_USERS } from '../mockData';

const normalizeEmail = (value?: string | null) => (value || '').trim().toLowerCase();

const configuredAdminEmails = String((import.meta as any).env?.VITE_ADMIN_EMAILS || '')
 .split(',')
 .map(normalizeEmail)
 .filter(Boolean);

const authorizedAdminEmails = new Set([
 ...REGISTERED_USERS.map(user => normalizeEmail(user.email)),
 ...configuredAdminEmails,
]);

const authorizedAdminIds = new Set(REGISTERED_USERS.map(user => user.id).filter(Boolean));

export const isAuthorizedAdminUser = (user?: { id: string; email?: string | null } | null): boolean => {
 if (!user) return false;
 return authorizedAdminIds.has(user.id) || authorizedAdminEmails.has(normalizeEmail(user.email));
};
