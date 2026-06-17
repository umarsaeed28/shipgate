import { ROLES, type Role } from "@qa/auth";
import { setRole } from "../actions";

const LABELS: Record<Role, string> = {
  client: "Client",
  qa_lead: "QA Lead",
  admin: "Admin",
};

/**
 * Dev-only role switcher in the topbar. Lets a reviewer flip the active role to
 * observe server-side gating. Not a real auth mechanism.
 */
export function RoleSwitch({ current }: { current: Role }) {
  return (
    <div className="role-switch">
      <span className="label">View as</span>
      {ROLES.map((role) => (
        <form key={role} action={setRole}>
          <input type="hidden" name="role" value={role} />
          <button
            type="submit"
            className={`role-btn${role === current ? " active" : ""}`}
          >
            {LABELS[role]}
          </button>
        </form>
      ))}
    </div>
  );
}
