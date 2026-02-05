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

  console.info("middleware", {
    path: request.nextUrl.pathname,
    method: request.method,
    hasUser: Boolean(user),
    host,
    proto,
    secureCookie: isHttps,
    cookieCount: incomingCookies.length,
    hasSbCookie,
    adminDisabled,
  });

  // AUTHORIZATION HERE
  // Protect investor summary page
  if (!user && request.nextUrl.pathname.startsWith("/investor/summary")) {
    // no user, redirect to login page
    const url = request.nextUrl.clone();
    url.pathname = "/";
    console.info("redirect", {
      from: request.nextUrl.pathname,
      to: url.pathname,
      reason: "unauthenticated",
    });
    return NextResponse.redirect(url);
  }

  // Protect other authenticated routes
  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone();
    url.pathname = "/";
    console.info("redirect", {
      from: request.nextUrl.pathname,
      to: url.pathname,
      reason: "unauthenticated",
    });
    return NextResponse.redirect(url);
  }

  // ONLY FOR ADMIN
  if (!adminDisabled && user && request.nextUrl.pathname.startsWith("/dashboard/admin/")) {
    const { data: userData, error: userError } = await supabase
      .from("user_role_members")
      .select("user_role_id")
      .eq("user_id", user.id);

    if (!userData || userError) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      console.info("redirect", {
        from: request.nextUrl.pathname,
        to: url.pathname,
        reason: "no_roles",
      });
      return NextResponse.redirect(url);
    }

    if (!userData.some((data) => data.user_role_id === 2)) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      console.info("redirect", {
        from: request.nextUrl.pathname,
        to: url.pathname,
        reason: "not_admin_role",
      });
      return NextResponse.redirect(url);
    }
  }

  // ADMIN-ONLY ROUTES - Flat Rate Page
  if (!adminDisabled && user && request.nextUrl.pathname.startsWith("/flat-rate")) {
    // Check if user is super admin in auth.users
    const { data: authUser, error: authError } = await supabase
      .from("auth.users")
      .select("is_super_admin")
      .eq("id", user.id)
      .single();

    // If not super admin, redirect to investor summary
    if (authError || !authUser?.is_super_admin) {
      const url = request.nextUrl.clone();
      url.pathname = "/investor/summary";
      console.info("redirect", {
        from: request.nextUrl.pathname,
        to: url.pathname,
        reason: "not_super_admin",
      });
      return NextResponse.redirect(url);
    }
  }

  // ADMIN-ONLY ROUTES - Admin Pages
  if (!adminDisabled && user && request.nextUrl.pathname.startsWith("/admin/")) {
    // Check if user is super admin in auth.users
    const { data: authUser, error: authError } = await supabase
      .from("auth.users")
      .select("is_super_admin")
      .eq("id", user.id)
      .single();

    // If not super admin, redirect to investor summary
    if (authError || !authUser?.is_super_admin) {
      const url = request.nextUrl.clone();
      url.pathname = "/investor/summary";
      console.info("redirect", {
        from: request.nextUrl.pathname,
        to: url.pathname,
        reason: "not_super_admin",
      });
      return NextResponse.redirect(url);
    }
  }

  // REDIRECT ADMINS FROM HOME PAGE TO ADMIN DASHBOARD
  if (user && request.nextUrl.pathname === "/") {
    // Check if user is super admin or has admin role
    const { data: authUser } = await supabase
      .from("auth.users")
      .select("is_super_admin")
      .eq("id", user.id)
      .single();

    // Check role assignments
    const { data: roleData } = await supabase
      .from("role_assignments")
      .select("role_name")
      .eq("user_id", user.id);

    const isSuperAdmin = authUser?.is_super_admin === true;
    const hasAdminRole = roleData?.some(
      (role: { role_name: string }) => role.role_name?.toLowerCase() === "admin"
    );

    // If admin, redirect to admin dashboard
    if (adminDisabled || isSuperAdmin || hasAdminRole) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/dashboard";
      console.info("redirect", {
        from: request.nextUrl.pathname,
        to: url.pathname,
        reason: "admin_to_dashboard",
      });
      return NextResponse.redirect(url);
    }
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
