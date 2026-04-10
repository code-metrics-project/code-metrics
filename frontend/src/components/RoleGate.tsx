import { useAuthStore } from "@/store/auth";
import { hasRole } from "@/utils/auth";

interface RoleGateProps {
  role: string;
  children: React.ReactNode;
}

/**
 * Renders its children only when the currently authenticated user holds the
 * specified role.  Use this to conditionally display UI elements based on
 * role without duplicating the token-decode logic at every call site.
 *
 * @example
 * <RoleGate role="admin">
 *   <NavLink to="/admin">Admin</NavLink>
 * </RoleGate>
 */
export function RoleGate({ role, children }: RoleGateProps) {
  const tokens = useAuthStore((state) => state.tokens);
  if (!hasRole(tokens?.accessToken, role)) {
    return null;
  }
  return <>{children}</>;
}
