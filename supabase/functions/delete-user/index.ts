import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server@^1";

type DeleteUserRequest = {
  userId?: unknown;
  user_id?: unknown;
};

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

function isNonEmptyString(
  value: unknown,
  maxLength = 100
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export default {
  fetch: withSupabase(
    { auth: "user" },
    async (req: Request, ctx: any) => {
      if (req.method !== "POST") {
        return json(
          { success: false, error: "Method not allowed." },
          405
        );
      }

      try {
        // 1. Verify the caller is authenticated.
        const callerId = ctx.userClaims?.sub;

        if (!callerId || !isValidUuid(callerId)) {
          return json(
            { success: false, error: "Authentication required." },
            401
          );
        }

        // 2. Verify the caller has an active Admin profile.
        const { data: callerProfile, error: callerProfileError } =
          await ctx.supabase
            .from("profiles")
            .select("id, role, status")
            .eq("id", callerId)
            .single();

        if (callerProfileError || !callerProfile) {
          console.error(
            "Unable to verify caller profile:",
            callerProfileError
          );

          return json(
            { success: false, error: "Unable to verify your profile." },
            403
          );
        }

        if (
          callerProfile.role !== "admin" ||
          callerProfile.status !== "active"
        ) {
          return json(
            {
              success: false,
              error: "Only active administrators can delete users.",
            },
            403
          );
        }

        // 3. Parse and validate the request.
        const body = (await req.json()) as DeleteUserRequest;

        // Support both names so the function works with existing frontend code.
        const requestedUserId =
          typeof body.userId === "string"
            ? body.userId
            : body.user_id;

        if (!isNonEmptyString(requestedUserId, 100)) {
          return json(
            { success: false, error: "Invalid or missing user ID." },
            400
          );
        }

        const targetUserId = requestedUserId.trim();

        if (!isValidUuid(targetUserId)) {
          return json(
            { success: false, error: "Invalid user ID format." },
            400
          );
        }

        // 4. Prevent self-deletion.
        if (targetUserId === callerId) {
          return json(
            {
              success: false,
              error:
                "You cannot delete your own active administrator account.",
            },
            400
          );
        }

        // 5. Verify the target profile exists before changing anything.
        const { data: targetProfile, error: targetProfileError } =
          await ctx.supabaseAdmin
            .from("profiles")
            .select(
              "id, name, email, phone_number, role, status, created_at, updated_at"
            )
            .eq("id", targetUserId)
            .single();

        if (targetProfileError || !targetProfile) {
          console.error(
            "Target profile lookup failed:",
            targetProfileError
          );

          return json(
            { success: false, error: "User not found." },
            404
          );
        }

        // 6. Delete the real Supabase Auth account.
        const { error: authDeleteError } =
          await ctx.supabaseAdmin.auth.admin.deleteUser(targetUserId);

        if (authDeleteError) {
          console.error(
            "Supabase Auth user deletion failed:",
            authDeleteError
          );

          return json(
            {
              success: false,
              error:
                "Unable to delete the user authentication account.",
            },
            500
          );
        }

        // 7. Delete the matching application profile.
        const { error: profileDeleteError } =
          await ctx.supabaseAdmin
            .from("profiles")
            .delete()
            .eq("id", targetUserId);

        if (profileDeleteError) {
          console.error(
            "Profile deletion failed after Auth deletion:",
            profileDeleteError
          );

          // The Auth user is already deleted. Do not report false success.
          return json(
            {
              success: false,
              error:
                "User authentication was deleted, but the profile could not be removed. Please check the profiles table.",
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
    }
  ),
};
