"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/client/login"; // Add other login paths if needed

  // You might want a more sophisticated auth check here
  // For now, it simply renders children. In a real app, you'd protect routes

  return <>{children}</>;
}
