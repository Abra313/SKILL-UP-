import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const videoIdPattern = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;
const allowedVideoTypes = new Set(["video/mp4", "video/quicktime", "video/webm"]);

function respond(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond({ error: "Method not allowed." }, 405);

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return respond({ error: "Sign in to continue." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      return respond({ error: "Supabase authentication is not configured for this function." }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: userResult, error: authError } = await supabase.auth.getUser();
    const user = userResult?.user;
    if (authError || !user) return respond({ error: "Your session is invalid or expired. Sign in again." }, 401);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) return respond({ error: "Could not verify your account role." }, 500);

    const body = await request.json();
    const action = typeof body?.action === "string" ? body.action : "";
    const isAdmin = profile?.role === "admin";
    const libraryId = Deno.env.get("BUNNY_STREAM_LIBRARY_ID");
    const apiKey = Deno.env.get("BUNNY_STREAM_API_KEY");

    if (action === "create-upload") {
      if (!isAdmin) return respond({ error: "Only administrators can upload course videos." }, 403);
      if (!libraryId || !/^\d{1,20}$/.test(libraryId) || !apiKey) {
        return respond({ error: "Bunny Stream upload credentials are not configured." }, 500);
      }
      const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
      const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
      const fileSize = Number(body.size);
      if (!fileName || fileName.length > 240 || !allowedVideoTypes.has(mimeType) ||
          !Number.isSafeInteger(fileSize) || fileSize <= 0 || fileSize > 536870912) {
        return respond({ error: "Choose an MP4, MOV or WebM video under 512 MB with a valid file name." }, 400);
      }

      const createResponse = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          AccessKey: apiKey
        },
        body: JSON.stringify({ title: fileName })
      });
      if (!createResponse.ok) {
        console.error("Bunny Stream video creation failed with status", createResponse.status);
        return respond({ error: `Bunny Stream could not create the video (HTTP ${createResponse.status}).` }, 502);
      }

      const video = await createResponse.json();
      if (typeof video?.guid !== "string" || !videoIdPattern.test(video.guid)) {
        return respond({ error: "Bunny Stream returned an invalid video ID." }, 502);
      }
      const expirationTime = Math.floor(Date.now() / 1000) + 86400;
      const signature = await sha256(`${libraryId}${apiKey}${expirationTime}${video.guid}`);
      return respond({ videoId: video.guid, libraryId, expirationTime, signature });
    }

    if (action === "sign-playback") {
      const courseId = typeof body.courseId === "string" ? body.courseId : "";
      const videoId = typeof body.videoId === "string" ? body.videoId : "";
      if (!courseId || courseId.length > 120 || !videoIdPattern.test(videoId)) {
        return respond({ error: "The course or video selection is invalid." }, 400);
      }
      if (!libraryId || !/^\d{1,20}$/.test(libraryId)) {
        return respond({ error: "Bunny Stream is not configured." }, 500);
      }
      const tokenKey = Deno.env.get("BUNNY_STREAM_TOKEN_AUTH_KEY");
      if (!tokenKey) return respond({ error: "Bunny Stream playback signing is not configured." }, 500);

      const workspaceKeys = isAdmin ? ["public", "admin"] : ["public"];
      const { data: workspaces, error: workspacesError } = await supabase
        .from("app_workspaces")
        .select("workspace_key,data")
        .in("workspace_key", workspaceKeys);
      if (workspacesError) return respond({ error: "Could not verify the course video." }, 500);
      const courseContainsVideo = (workspaces || []).some((workspace) =>
        Array.isArray(workspace.data?.courses) && workspace.data.courses.some(
          (course: Record<string, unknown>) => course.id === courseId &&
            Array.isArray(course.moduleMaterials) && course.moduleMaterials.some(
              (material: Record<string, unknown>) => material.provider === "bunny" && material.videoId === videoId
            )
        )
      );
      if (!courseContainsVideo) return respond({ error: "This video is not attached to the selected course." }, 404);

      if (!isAdmin) {
        const { data: workspace, error: workspaceError } = await supabase
          .from("app_workspaces")
          .select("data")
          .eq("workspace_key", `learner:${user.id}`)
          .maybeSingle();
        if (workspaceError) return respond({ error: "Could not verify course access." }, 500);
        const data = workspace?.data;
        const hasPurchase = Array.isArray(data?.purchases) && data.purchases.some(
          (purchase: Record<string, unknown>) => purchase.courseId === courseId && purchase.status === "Successful"
        );
        const hasEnrollment = Array.isArray(data?.enrollments) && data.enrollments.some(
          (enrollment: Record<string, unknown>) => enrollment.courseId === courseId && enrollment.status === "Active"
        );
        if (!hasPurchase && !hasEnrollment) {
          return respond({ error: "You must be enrolled in this course to watch its videos." }, 403);
        }
      }

      const expires = Math.floor(Date.now() / 1000) + 3600;
      const token = await sha256(`${tokenKey}${videoId}${expires}`);
      const url = `https://player.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&expires=${expires}`;
      return respond({ url, expires });
    }

    if (action === "delete-videos") {
      if (!isAdmin) return respond({ error: "Only administrators can delete course videos." }, 403);
      if (!libraryId || !/^\d{1,20}$/.test(libraryId) || !apiKey) {
        return respond({ error: "Bunny Stream upload credentials are not configured." }, 500);
      }
      const videoIds = Array.isArray(body.videoIds) ? [...new Set(body.videoIds)] : [];
      if (videoIds.length > 100 || videoIds.some((id) => typeof id !== "string" || !videoIdPattern.test(id))) {
        return respond({ error: "The video selection is invalid." }, 400);
      }

      const failedIds: string[] = [];
      for (const videoId of videoIds) {
        const deleteResponse = await fetch(
          `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`,
          { method: "DELETE", headers: { AccessKey: apiKey } }
        );
        if (!deleteResponse.ok && deleteResponse.status !== 404) failedIds.push(videoId);
      }
      if (failedIds.length) {
        console.error(`Bunny Stream could not delete ${failedIds.length} course video(s).`);
        return respond({ error: "Bunny Stream could not delete one or more replaced videos." }, 502);
      }
      return respond({ deletedVideoIds: videoIds });
    }

    return respond({ error: "Unknown Bunny Stream action." }, 400);
  } catch (error) {
    console.error("Bunny course media request failed:", error);
    return respond({ error: error instanceof Error ? error.message : "Bunny Stream request failed." }, 500);
  }
});
