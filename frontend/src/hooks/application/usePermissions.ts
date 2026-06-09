import { useAuth } from "@/contexts/AuthContext";
import { hasFullAccessRole } from "@/features/business/permissions/permissionCatalog";

export {
  AVAILABLE_PERMISSIONS,
  ROLE_PERMISSION_PRESETS,
} from "@/features/business/permissions/permissionCatalog";

/**
 * Hook for checking user permissions.
 * Admin role and superusers bypass all checks.
 */
export function usePermissions() {
  const { user } = useAuth();

  const hasFullAccess =
    !!user &&
    (user.is_superuser || hasFullAccessRole(user.role));

  /** Check if user has a specific permission */
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (hasFullAccess) return true;
    return (user.permissions ?? []).includes(permission);
  };

  /** Check if user has ANY of the given permissions */
  const hasAnyPermission = (...permissions: string[]): boolean => {
    if (!user) return false;
    if (hasFullAccess) return true;
    return permissions.some((p) => (user.permissions ?? []).includes(p));
  };

  return { hasPermission, hasAnyPermission, hasFullAccess };
}
