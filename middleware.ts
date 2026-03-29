import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === "/login";
  const isChangePasswordPage = pathname === "/change-password";
  const isCollabRoute = pathname.startsWith("/collab");
  const isCollabPublicRoute = pathname === "/collab" || pathname === "/collab/login" || pathname === "/collab/pin";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { role?: string | null; first_login?: boolean | null } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role, first_login")
      .eq("id", user.id)
      .maybeSingle();
    profile = (data as { role?: string | null; first_login?: boolean | null } | null) ?? null;
  }

  if (isCollabRoute) {
    if (!user && !isCollabPublicRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/collab/login";
      return NextResponse.redirect(url);
    }

    if (!user) return response;

    if (profile?.role === "manager") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    if (isCollabPublicRoute) {
      const url = request.nextUrl.clone();
      url.pathname = profile?.first_login ? "/collab/change-pin" : "/collab/home";
      return NextResponse.redirect(url);
    }

    if (pathname === "/collab/change-pin" && !profile?.first_login) {
      const url = request.nextUrl.clone();
      url.pathname = "/collab/home";
      return NextResponse.redirect(url);
    }

    return response;
  }

  if (!user && !isLoginPage && !isChangePasswordPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (!user && isChangePasswordPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && profile?.role === "collaborateur") {
    const url = request.nextUrl.clone();
    url.pathname = profile.first_login ? "/collab/change-pin" : "/collab/home";
    return NextResponse.redirect(url);
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icons).*)"],
};
