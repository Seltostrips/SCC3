import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secretKey = process.env.JWT_SECRET || "fallback-development-secret-scc3-2026";
const encodedKey = new TextEncoder().encode(secretKey);

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. Define Protected Route Segments
  const isAdminRoute = path.startsWith("/admin") && !path.startsWith("/admin/login");
  const isStaffRoute = path.startsWith("/staff") && !path.startsWith("/staff/login");
  const isClientRoute = path.startsWith("/client") && !path.startsWith("/client/login");
  
  // Protect backend administrative endpoints (excluding the init bootstrap route)
  const isApiProtectedRoute = path.startsWith("/api/admin") && !path.startsWith("/api/admin/init");

  // Allow public routes to bypass execution immediately
  if (!isAdminRoute && !isStaffRoute && !isClientRoute && !isApiProtectedRoute) {
    return NextResponse.next();
  }

  // 2. Extract Token
  const token = request.cookies.get("session")?.value;

  // 3. Fallback routing if missing token
  if (!token) {
    if (isClientRoute) return NextResponse.redirect(new URL("/client/login", request.url));
    if (isStaffRoute) return NextResponse.redirect(new URL("/admin/login", request.url)); // Staff shares admin login portal
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  try {
    // 4. Cryptographic Token Verification
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });

    const role = payload.role as string;

    // 5. Strict Role-Based Access Enforcement
    if (isAdminRoute && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    
    if (isStaffRoute && role !== "STAFF" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    
    if (isClientRoute && role !== "CLIENT") {
      return NextResponse.redirect(new URL("/client/login", request.url));
    }

    if (isApiProtectedRoute && role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized Request" }, { status: 401 });
    }

    // Execution Authorized
    return NextResponse.next();
  } catch (error) {
    // Token is expired or digitally tampered with
    console.error("JWT Verification Failed:", error);
    
    // Purge the invalid cookie visually by redirecting to login
    const loginUrl = isClientRoute ? "/client/login" : "/admin/login";
    const response = NextResponse.redirect(new URL(loginUrl, request.url));
    response.cookies.delete("session");
    return response;
  }
}

// 6. Matcher Config: Tells Next.js exactly which routes to run this middleware on
export const config = {
  matcher: [
    "/admin/:path*",
    "/staff/:path*",
    "/client/:path*",
    "/api/admin/:path*"
  ],
};
