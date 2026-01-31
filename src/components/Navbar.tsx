"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  ShoppingCart,
  User,
  LogOut,
  Menu,
  Heart,
  FileText,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { useCurrentUserClient } from "@/hook/use-current-user";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user: session } = useCurrentUserClient();

  const isAuthPage = pathname?.startsWith("/auth");
  const isVendorPage = pathname?.startsWith("/vendor");
  const isAdminPage = pathname?.startsWith("/admin");

  // Don't show navbar on auth pages, vendor pages, or admin pages
  if (isAuthPage || isVendorPage || isAdminPage) return null;

  // If vendor is on customer pages, redirect them
  const isVendor = session?.role === "VENDOR";
  const isAdmin = session?.role === "ADMIN";

  return (
    <nav className="border-b bg-white sticky top-0 z-40">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link
            href={
              isVendor
                ? "/vendor/dashboard"
                : isAdmin
                  ? "/admin/dashboard"
                  : "/"
            }
            className="font-bold text-2xl text-primary"
          >
            RentNow
          </Link>

          {/* Desktop Menu - Only show for non-vendor/admin users */}
          {!isVendor && !isAdmin && (
            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/products"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Browse Products
              </Link>
              {session && session.role === "CUSTOMER" && (
                <>
                  <Link
                    href="/wishlist"
                    className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <Heart className="h-5 w-5" />
                    Wishlist
                  </Link>
                  <Link
                    href="/quotations"
                    className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <FileText className="h-5 w-5" />
                    Quotations
                  </Link>
                  <Link
                    href="/orders"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    My Orders
                  </Link>
                </>
              )}
            </div>
          )}

          {/* Vendor/Admin quick link to dashboard */}
          {(isVendor || isAdmin) && (
            <div className="hidden md:flex items-center gap-6">
              <Link
                href={isVendor ? "/vendor/dashboard" : "/admin/dashboard"}
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
              >
                <LayoutDashboard className="h-5 w-5" />
                Go to Dashboard
              </Link>
            </div>
          )}

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {session && session.role === "CUSTOMER" && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.push("/cart")}
                className="relative"
              >
                <ShoppingCart className="h-5 w-5" />
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  0
                </span>
              </Button>
            )}

            {session ? (
              <div className="flex items-center gap-2">
                {!isVendor && !isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push("/profile")}
                  >
                    <User className="h-5 w-5" />
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => signOut()}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push("/auth/login")}
                >
                  Login
                </Button>
                <Button onClick={() => router.push("/auth/signup")}>
                  Sign Up
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-2 border-t pt-4">
            {!isVendor && !isAdmin ? (
              <>
                <Link
                  href="/products"
                  className="block px-4 py-2 text-muted-foreground hover:bg-gray-100 rounded"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Browse Products
                </Link>
                {session && session.role === "CUSTOMER" && (
                  <>
                    <Link
                      href="/wishlist"
                      className="block px-4 py-2 text-muted-foreground hover:bg-gray-100 rounded"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Wishlist
                    </Link>
                    <Link
                      href="/quotations"
                      className="block px-4 py-2 text-muted-foreground hover:bg-gray-100 rounded"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Quotations
                    </Link>
                    <Link
                      href="/orders"
                      className="block px-4 py-2 text-muted-foreground hover:bg-gray-100 rounded"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      My Orders
                    </Link>
                  </>
                )}
              </>
            ) : (
              <Link
                href={isVendor ? "/vendor/dashboard" : "/admin/dashboard"}
                className="block px-4 py-2 text-muted-foreground hover:bg-gray-100 rounded"
                onClick={() => setIsMenuOpen(false)}
              >
                Go to Dashboard
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
