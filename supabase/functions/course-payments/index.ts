import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const COURSE_PRICE_NGN = 5000;
const COURSE_PRICE_KOBO = COURSE_PRICE_NGN * 100;
const BUNDLE_PRICE_NGN = 25000;
const BUNDLE_PRICE_KOBO = BUNDLE_PRICE_NGN * 100;

function respond(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function learnerWorkspaceKey(userId: string) {
  return `learner:${userId}`;
}

async function saveVerifiedPurchase(
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
  plan: "course" | "bundle",
  courseId: string | null,
  amount: number,
  reference: string
) {
  const { data: workspaceRow, error: loadError } = await serviceClient
    .from("app_workspaces")
    .select("data")
    .eq("workspace_key", learnerWorkspaceKey(userId))
    .maybeSingle();
  if (loadError) throw loadError;

  const workspace = isRecord(workspaceRow?.data) ? workspaceRow.data : {};
  const purchases = Array.isArray(workspace.purchases) ? workspace.purchases : [];
  const purchase = {
    courseId,
    plan,
    purchasedAt: new Date().toISOString(),
    amount,
    status: "Successful",
    receipt: reference,
    method: "Paystack"
  };
  const existingIndex = purchases.findIndex(
    (item) => isRecord(item) && (
      item.receipt === reference ||
      (plan === "course" && item.courseId === courseId)
    )
  );
  if (existingIndex < 0) purchases.push(purchase);
  else purchases[existingIndex] = { ...purchases[existingIndex], ...purchase };

  const { error: saveError } = await serviceClient.from("app_workspaces").upsert({
    workspace_key: learnerWorkspaceKey(userId),
    owner_id: userId,
    data: { ...workspace, purchases },
    updated_at: new Date().toISOString()
  }, { onConflict: "workspace_key" });
  if (saveError) throw saveError;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond({ error: "Method not allowed." }, 405);

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return respond({ error: "Sign in to continue." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return respond({ error: "Supabase payment verification is not configured for this function." }, 500);
    }
    if (!paystackSecret) {
      return respond({ error: "Add PAYSTACK_SECRET_KEY to the Supabase Edge Function secrets." }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: userResult, error: authError } = await userClient.auth.getUser();
    const user = userResult?.user;
    if (authError || !user?.email) return respond({ error: "Your session is invalid or has no email address." }, 401);

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data: profile, error: profileError } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) return respond({ error: "Could not verify your account role." }, 500);
    if (!profile || !["learner", "user"].includes(profile.role)) {
      return respond({ error: "Only learner accounts can purchase courses." }, 403);
    }

    const body = await request.json();
    const action = typeof body?.action === "string" ? body.action : "";

    if (action === "initialize") {
      if (body.plan != null && !["course", "bundle"].includes(body.plan)) {
        return respond({ error: "Select a valid course payment plan." }, 400);
      }
      const plan = body.plan === "bundle" ? "bundle" : "course";
      const courseId = typeof body.courseId === "string" ? body.courseId.trim() : "";
      if (plan === "course" && !/^[\w-]{1,120}$/.test(courseId)) {
        return respond({ error: "The course selection is invalid." }, 400);
      }
      const { data: workspace, error: workspaceError } = await serviceClient
        .from("app_workspaces")
        .select("data")
        .eq("workspace_key", "public")
        .maybeSingle();
      if (workspaceError) return respond({ error: "Could not verify this course." }, 500);
      const courses = Array.isArray(workspace?.data?.courses) ? workspace.data.courses : [];
      const course = plan === "course"
        ? courses.find((item: Record<string, unknown>) =>
          item.id === courseId && item.status === "Published"
        )
        : null;
      if (plan === "course") {
        const modules = typeof course?.modules === "string"
          ? course.modules.split(/\r?\n/).map((module: string) => module.trim()).filter(Boolean)
          : [];
        if (!course || modules.length < 2) {
          return respond({ error: "This published course does not have paid modules available yet." }, 404);
        }
      } else if (!courses.some((item: Record<string, unknown>) => item.status === "Published")) {
        return respond({ error: "There are no published courses available for the bundle yet." }, 404);
      }

      const { data: existingBundle, error: bundleError } = await serviceClient
        .from("course_bundle_access")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (bundleError) return respond({ error: "Could not check your all-course access." }, 500);
      if (existingBundle?.status === "active") {
        return respond({ error: "You already have access to all published courses." }, 409);
      }
      if (plan === "course") {
        const { data: existingAccess, error: accessError } = await serviceClient
          .from("course_access")
          .select("status")
          .eq("user_id", user.id)
          .eq("course_id", courseId)
          .maybeSingle();
        if (accessError) return respond({ error: "Could not check your course access." }, 500);
        if (existingAccess?.status === "active") {
          return respond({ error: "You already have access to the full course." }, 409);
        }
      }

      const origin = request.headers.get("Origin");
      const callbackUrl = typeof body.callbackUrl === "string" ? body.callbackUrl : "";
      let callback: URL;
      try {
        callback = new URL(callbackUrl);
      } catch {
        return respond({ error: "The payment return URL is invalid." }, 400);
      }
      if (!origin || callback.origin !== origin || !/^https?:$/.test(callback.protocol) ||
          !callback.pathname.endsWith("/student.html")) {
        return respond({ error: "The payment return URL must point to this Skill Up Hub site." }, 400);
      }
      callback.searchParams.set("payment", plan);
      callback.searchParams.set("action", "verify");

      const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          email: user.email,
          amount: plan === "bundle" ? BUNDLE_PRICE_KOBO : COURSE_PRICE_KOBO,
          currency: "NGN",
          callback_url: callback.href,
          metadata: {
            user_id: user.id,
            plan,
            course_id: plan === "course" ? courseId : null,
            course_title: plan === "course" ? String(course?.title || "").slice(0, 100) : "All published courses"
          }
        })
      });
      const initialized = await paystackResponse.json().catch(() => null);
      if (!paystackResponse.ok || initialized?.status !== true ||
          typeof initialized.data?.authorization_url !== "string" ||
          typeof initialized.data?.reference !== "string") {
        console.error("Paystack could not initialize a course payment. HTTP status:", paystackResponse.status);
        return respond({ error: "Paystack could not start the payment. Please try again." }, 502);
      }

      const { error: paymentSaveError } = await serviceClient.from("course_payments").upsert({
        reference: initialized.data.reference,
        user_id: user.id,
        course_id: plan === "course" ? courseId : null,
        plan,
        amount_kobo: plan === "bundle" ? BUNDLE_PRICE_KOBO : COURSE_PRICE_KOBO,
        currency: "NGN",
        status: "pending",
        created_at: new Date().toISOString()
      }, { onConflict: "reference" });
      if (paymentSaveError) {
        console.error("Could not save the pending course payment:", paymentSaveError.message);
        return respond({ error: "The payment could not be recorded. Please contact support before retrying." }, 500);
      }

      return respond({
        authorizationUrl: initialized.data.authorization_url,
        reference: initialized.data.reference
      });
    }

    if (action === "verify") {
      const reference = typeof body.reference === "string" ? body.reference.trim() : "";
      if (!reference || reference.length > 120) return respond({ error: "The payment reference is invalid." }, 400);

      const { data: payment, error: paymentError } = await serviceClient
        .from("course_payments")
        .select("reference,user_id,course_id,plan,amount_kobo,currency,status")
        .eq("reference", reference)
        .eq("user_id", user.id)
        .maybeSingle();
      if (paymentError) return respond({ error: "Could not verify your payment record." }, 500);
      if (!payment) return respond({ error: "This payment reference does not belong to your account." }, 404);
      const plan = payment.plan === "bundle" ? "bundle" : "course";
      const expectedAmountKobo = plan === "bundle" ? BUNDLE_PRICE_KOBO : COURSE_PRICE_KOBO;
      const amountNgn = expectedAmountKobo / 100;
      if (payment.amount_kobo !== expectedAmountKobo || payment.currency !== "NGN") {
        return respond({ error: "The payment amount does not match the selected access plan." }, 409);
      }
      if (payment.status === "refunded") {
        return respond({ error: "This payment has been marked refunded and cannot unlock the course." }, 409);
      }

      if (plan === "bundle") {
        const { data: existingBundle, error: existingBundleError } = await serviceClient
          .from("course_bundle_access")
          .select("status,payment_reference")
          .eq("user_id", user.id)
          .maybeSingle();
        if (existingBundleError) return respond({ error: "Could not check your all-course access." }, 500);
        if (payment.status === "successful" && existingBundle?.status === "revoked") {
          return respond({ error: "All-course access was revoked. Contact support if you believe this is incorrect." }, 409);
        }
        if (payment.status === "successful" && existingBundle?.status === "active" &&
            existingBundle.payment_reference !== reference) {
          return respond({ error: "This bundle purchase has already been superseded by another access record." }, 409);
        }
      } else {
        const { data: existingAccess, error: existingAccessError } = await serviceClient
          .from("course_access")
          .select("status,payment_reference")
          .eq("user_id", user.id)
          .eq("course_id", payment.course_id)
          .maybeSingle();
        if (existingAccessError) return respond({ error: "Could not check your course access." }, 500);
        if (payment.status === "successful" && existingAccess?.status === "revoked") {
          return respond({ error: "Access for this course was revoked. Contact support if you believe this is incorrect." }, 409);
        }
        if (payment.status === "successful" && existingAccess?.status === "active" &&
            existingAccess.payment_reference && existingAccess.payment_reference !== reference) {
          return respond({ error: "This course purchase has already been superseded by another access record." }, 409);
        }
      }

      if (payment.status !== "successful") {
        const verificationResponse = await fetch(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
          { headers: { Authorization: `Bearer ${paystackSecret}`, Accept: "application/json" } }
        );
        const verified = await verificationResponse.json().catch(() => null);
        const transaction = verified?.data;
        const transactionMetadata = transaction?.metadata;
        const validTransaction = verificationResponse.ok &&
          verified?.status === true &&
          transaction?.status === "success" &&
          transaction?.reference === reference &&
          transaction?.amount === expectedAmountKobo &&
          transaction?.currency === "NGN" &&
          String(transaction?.customer?.email || "").toLowerCase() === user.email.toLowerCase() &&
          transactionMetadata?.user_id === user.id &&
          (transactionMetadata?.plan === plan ||
            (plan === "course" &&
              (transactionMetadata?.plan === undefined || transactionMetadata?.plan === null))) &&
          (plan === "bundle"
            ? transactionMetadata?.course_id == null
            : transactionMetadata?.course_id === payment.course_id);
        if (!validTransaction) {
          if (transaction && transaction.status !== "success") {
            const { error: failedPaymentError } = await serviceClient.from("course_payments")
              .update({ status: "failed" })
              .eq("reference", reference)
              .eq("user_id", user.id);
            if (failedPaymentError) {
              console.error("Could not save unsuccessful payment status:", failedPaymentError.message);
              return respond({ error: "Paystack did not confirm the payment and its status could not be updated." }, 500);
            }
          }
          return respond({ error: "Paystack has not confirmed this payment. If you were charged, contact support with your reference." }, 402);
        }

        const { error: updatePaymentError } = await serviceClient.from("course_payments")
          .update({
            status: "successful",
            channel: typeof transaction.channel === "string" ? transaction.channel : null,
            verified_at: new Date().toISOString()
          })
          .eq("reference", reference)
          .eq("user_id", user.id);
        if (updatePaymentError) {
          console.error("Could not save verified course payment:", updatePaymentError.message);
          return respond({ error: "Paystack confirmed your payment, but course access could not be recorded. Contact support with your reference." }, 500);
        }
      }

      const { error: accessSaveError } = plan === "bundle"
        ? await serviceClient.from("course_bundle_access").upsert({
          user_id: user.id,
          payment_reference: reference,
          amount_kobo: BUNDLE_PRICE_KOBO,
          status: "active",
          granted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" })
        : await serviceClient.from("course_access").upsert({
          user_id: user.id,
          course_id: payment.course_id,
          source: "paystack",
          payment_reference: reference,
          amount_kobo: COURSE_PRICE_KOBO,
          status: "active",
          granted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id,course_id" });
      if (accessSaveError) {
        console.error("Could not grant verified course access:", accessSaveError.message);
        return respond({ error: "Your payment is confirmed, but course access could not be granted. Contact support with your reference." }, 500);
      }

      try {
        await saveVerifiedPurchase(serviceClient, user.id, plan, payment.course_id, amountNgn, reference);
      } catch (error) {
        console.error("Could not synchronize the verified course purchase:", error);
        return respond({ error: "Your payment is confirmed and access is active, but the purchase history could not be refreshed." }, 500);
      }

      const { error: referralError } = await serviceClient.rpc("record_referral_conversion", {
        p_referred_user_id: user.id,
        p_course_id: plan === "bundle" ? "ALL_COURSES" : payment.course_id,
        p_payment_id: reference,
        p_amount: amountNgn
      });
      if (referralError) {
        console.error("Could not record the verified referral commission:", referralError.message);
        return respond({ error: "Your payment is confirmed and access is active, but the referral commission could not be recorded. Contact support with your reference." }, 500);
      }

      return respond({
        plan,
        courseId: payment.course_id,
        reference,
        amount: amountNgn,
        status: "Successful"
      });
    }

    return respond({ error: "Unknown course payment action." }, 400);
  } catch (error) {
    console.error("Course payment request failed:", error);
    return respond({ error: error instanceof Error ? error.message : "Course payment request failed." }, 500);
  }
});
