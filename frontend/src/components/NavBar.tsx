"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearToken, getRole, getToken } from "@/lib/auth";

export default function NavBar(): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [role, setRole] = useState<"admin" | "user" | null>(null);

  useEffect(() => {
    setAuthenticated(Boolean(getToken()));
    setRole(getRole());
  }, [pathname]);

  const links = [
    { href: "/", label: "Home" },
    { href: "/profile", label: "Profile" },
    { href: "/discover", label: "Discover" },
    ...(role === "admin" ? [{ href: "/admin", label: "Admin" }] : [])
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/30 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="text-xl font-bold tracking-tight text-ink">
          muduo
        </Link>
        <nav className="flex items-center gap-4 text-sm sm:text-base">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition ${
                  active ? "font-semibold text-ocean" : "text-ink/75 hover:text-ocean"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {authenticated ? (
            <button
              type="button"
              className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white sm:text-sm"
              onClick={() => {
                clearToken();
                router.push("/auth");
              }}
            >
              Logout
            </button>
          ) : (
            <Link
              href="/auth"
              className="rounded-full bg-coral px-3 py-1.5 text-xs font-semibold text-white sm:text-sm"
            >
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
