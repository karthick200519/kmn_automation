import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server@^1";

type DeleteUserRequest = {
  user_id?: unknown;
};

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

function isNonEmptyString(value: unknown, maxLength = 100): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req: Request, ctx: any) => {
    if (req.method !== "POST") {
      return json({ success: false, error: "Method not allowed." }, 405);
    }

    try {
      // Verify caller authentication
      const callerId = ctx.userClaims?.sub;

      if (!callerId) {
        return json(
          { success: false, error: "Authentication required." },
          401
        );
      }

      // Verify caller is an active Admin profile
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
            error: "Only active administrators can delete users.",
          },
          403
        );
      }

      const body = (await req.json()) as DeleteUserRequest;

      if (!isNonEmptyString(body.user_id, 100)) {
        return json(
          { success: false, error: "Invalid or missing user ID." },
          400
        );
      }

      const targetUserId = body.user_id.trim();

      // Prevent Admin from deleting their own account via API
      if (targetUserId === callerId) {
        return json(
          {
            success: false,
            error: "You cannot delete your own active administrator account.",
          },
          400
        );
      }

      // 1. Delete from application profiles table
      const { error: profileDeleteError } = await ctx.supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", targetUserId);

      if (profileDeleteError) {
        console.error("Failed to delete user profile:", profileDeleteError);
      }

      // 2. Delete Supabase Auth user
      const { error: authDeleteError } =
        await ctx.supabaseAdmin.auth.admin.deleteUser(targetUserId);

      if (authDeleteError) {
        console.error("Auth user deletion error:", authDeleteError);
        return json(
          {
            success: false,
            error: "Unable to delete user authentication account.",
          },
          500
        );
      }

      return json({
        success: true,
        message: "User account deleted successfully.",
      });
    } catch (error) {
      console.error("delete-user function error:", error);

      return json(
        {
          success: false,
          error: "An error occurred while deleting the user.",
        },
        500
      );
    }
  }),
};
