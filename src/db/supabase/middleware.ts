import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieSpec = {
  name: string;
  value: string;
  options?: Record<string, any>;
};

export async function supabaseMiddleware(request: NextRequest) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    throw new Error(
      "Environment variables not found for NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const proto = (forwardedProto || request.nextUrl.protocol || "").replace(":", "");
  const isHttps = proto === "https";
  const host = request.nextUrl.hostname || "";
  const isLocalHttp = !isHttps && (host === "localhost" || host === "127.0.0.1");

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieSpec[]) {
          cookiesToSet.forEach(({ name, value }: CookieSpec) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }: CookieSpec) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
      cookieOptions: {
        path: "/",
        sameSite: "lax",
        secure: isHttps,
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const incomingCookies = request.cookies.getAll();
  const cookieNames = incomingCookies.map((c) => c.name);
  const hasSbCookie = cookieNames.some((n) => n.includes("sb:"));
  const adminDisabled = process.env.DISABLE_ADMIN_CHECK === "true";
  const pathname = request.nextUrl.pathname;

  console.info("middleware", {
    path: pathname,
    method: request.method,
    hasUser: Boolean(user),
    host,
    proto,
    secureCookie: isHttps,
    cookieCount: incomingCookies.length,
    hasSbCookie,
    adminDisabled,
  });

  // Protect investor summary page
  if (!user && pathname.startsWith("/investor/summary")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Protect other authenticated routes
  if (!user && pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Early return for unauthenticated users or routes that don't need role checks
  if (!user || adminDisabled) {
    if (adminDisabled && user && pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/dashboard";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Determine if this route needs a role check at all
  const needsAdminDashboardCheck = pathname.startsWith("/dashboard/admin/");
  const needsFlatRateCheck = pathname.startsWith("/flat-rate");
  const needsAdminRouteCheck = pathname.startsWith("/admin/");
  const isHomePage = pathname === "/";

  const needsRoleCheck = needsAdminDashboardCheck || needsFlatRateCheck || needsAdminRouteCheck || isHomePage;

  if (!needsRoleCheck) {
    return supabaseResponse;
  }

  // Single role query for all route checks
  const [roleMembersResult, roleAssignmentsResult] = await Promise.all([
    needsAdminDashboardCheck
      ? supabase.from("user_role_members").select("user_role_id").eq("user_id", user.id)
      : Promise.resolve({ data: null, error: null }),
    supabase.from("role_assignments").select("role_name").eq("user_id", user.id),
  ]);

  const hasAdminRole = roleAssignmentsResult.data?.some(
    (role: { role_name: string }) => role.role_name?.toLowerCase() === "admin"
  );

  // ONLY FOR ADMIN - /dashboard/admin/ routes
  if (needsAdminDashboardCheck) {
    const { data: userData, error: userError } = roleMembersResult;

    if (!userData || userError) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    if (!userData.some((data) => data.user_role_id === 2)) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // ADMIN-ONLY ROUTES - Flat Rate Page
  if (needsFlatRateCheck) {
    if (roleAssignmentsResult.error || !hasAdminRole) {
      const url = request.nextUrl.clone();
      url.pathname = "/investor/summary";
      return NextResponse.redirect(url);
    }
  }

  // ADMIN-ONLY ROUTES - Admin Pages
  if (needsAdminRouteCheck) {
    if (roleAssignmentsResult.error || !hasAdminRole) {
      const url = request.nextUrl.clone();
      url.pathname = "/investor/summary";
      return NextResponse.redirect(url);
    }
  }

  // REDIRECT ADMINS FROM HOME PAGE TO ADMIN DASHBOARD
  if (isHomePage && hasAdminRole) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/dashboard";
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
