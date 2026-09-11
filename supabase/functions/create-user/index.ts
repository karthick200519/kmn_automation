import "@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore
import { withSupabase } from "npm:@supabase/server@^1";

type CreateUserRequest = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  role?: unknown;
  status?: unknown;
};

const ALLOWED_ROLES = ["admin", "engineer", "operator"] as const;
const ALLOWED_STATUS = ["active", "inactive"] as const;

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req: Request, ctx: any) => {
    if (req.method !== "POST") {
      return json({ success: false, error: "Method not allowed." }, 405);
    }

    try {
      // The function is only available to authenticated users.
      // Verify that the caller is an Admin.
      const callerId = ctx.userClaims?.sub;

      if (!callerId) {
        return json(
          { success: false, error: "Authentication required." },
          401
        );
      }

      const { data: callerProfile, error: callerProfileError } =
        await ctx.supabase
          .from("profiles")
          .select("id, role, status")
          .eq("id", callerId)
          .single();

      if (callerProfileError || !callerProfile) {
        return json(
          { success: false, error: "Unable to verify your profile." },
          403
        );
      }

      if (
        callerProfile.status !== "active" ||
        callerProfile.role !== "admin"
      ) {
        return json(
          {
            success: false,
            error: "Only active administrators can create users.",
          },
          403
        );
      }

      const body = (await req.json()) as CreateUserRequest;

      // Strict input validation
      if (!isNonEmptyString(body.name, 100)) {
        return json(
          { success: false, error: "Invalid user name." },
          400
        );
      }

      if (!isNonEmptyString(body.email, 254) || !isValidEmail(body.email)) {
        return json(
          { success: false, error: "Invalid email address." },
          400
        );
      }

      if (!isNonEmptyString(body.password, 128) || body.password.length < 8) {
        return json(
          {
            success: false,
            error: "Password must be at least 8 characters.",
          },
          400
        );
      }

      if (
        typeof body.role !== "string" ||
        !ALLOWED_ROLES.includes(body.role as (typeof ALLOWED_ROLES)[number])
      ) {
        return json(
          { success: false, error: "Invalid user role." },
          400
        );
      }

      if (
        typeof body.status !== "string" ||
        !ALLOWED_STATUS.includes(
          body.status as (typeof ALLOWED_STATUS)[number]
        )
      ) {
        return json(
          { success: false, error: "Invalid user status." },
          400
        );
      }

      const name = body.name.trim();
      const email = body.email.trim().toLowerCase();
      const password = body.password;
      const role = body.role as "admin" | "engineer" | "operator";
      const status = body.status as "active" | "inactive";

      // Create the real Supabase Auth account.
      // This uses the server-side privileged client.
      const {
        data: authData,
        error: authError,
      } = await ctx.supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          role,
        },
      });

      if (authError || !authData.user) {
        console.error("Auth user creation failed:", authError);

        return json(
          {
            success: false,
            error: "Unable to create the user account.",
          },
          400
        );
      }

      const authUserId = authData.user.id;

      // Create the corresponding application profile.
      const {
        data: profile,
        error: profileError,
      } = await ctx.supabaseAdmin
        .from("profiles")
        .insert({
          id: authUserId,
          name,
          email,
          role,
          status,
        })
        .select("id, name, email, role, status, created_at, updated_at")
        .single();

      if (profileError || !profile) {
        console.error("Profile creation failed:", profileError);

        // Roll back the Auth user if the profile cannot be created.
        const { error: rollbackError } =
          await ctx.supabaseAdmin.auth.admin.deleteUser(authUserId);

        if (rollbackError) {
          console.error("Rollback failed:", rollbackError);
        }

        return json(
          {
            success: false,
            error: "Unable to create the user profile.",
          },
          500
        );
      }

      return json({
        success: true,
        message: "User created successfully.",
        user: profile,
      });
    } catch (error) {
      console.error("create-user function error:", error);

      return json(
        {
          success: false,
          error: "Unable to create the user.",
        },
        500
      );
    }
  }),
};