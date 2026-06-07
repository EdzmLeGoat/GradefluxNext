import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";

interface SidebarElementProps {
  pageLink: string;
  icon: string; // public URL path
  label: string;
}

export default function SidebarElement({
  pageLink,
  icon,
  label,
}: SidebarElementProps) {
  const [isActive, setIsActive] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const pathname = window.location.pathname;

    // Home-like behavior
    const isHomeLink =
      pageLink === "/" || pageLink === "" || pageLink === "/home";
    const onClassListPath =
      ["/classlist", "/class-list", "/classes", "/home"].some(
        (p) => pathname === p,
      ) ||
      pathname.startsWith("/class-list") ||
      pathname.startsWith("/class");

    // Treat any /class-details/* path as matching a Details link that points to /class-details/*
    const isClassDetailsLink =
      pageLink.startsWith("/class-details") &&
      pathname.startsWith("/class-details");

    const exactMatch = pathname === pageLink;
    setIsActive(
      exactMatch || (isHomeLink && onClassListPath) || isClassDetailsLink,
    );
  }, [pageLink]);

  function handleClick() {
    if (typeof window === "undefined") return;

    // If this is the Logout link, clear session data and auth cookie first
    if (pageLink === "/login") {
      try {
        localStorage.removeItem("gradefluxSession");
      } catch (e) {
        /* ignore */
      }
      // remove any per-class selected details keys
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith("selectedClassDetails")) keysToRemove.push(k);
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch (e) {
        /* ignore */
      }

      // remove auth cookie so middleware will not consider the user authenticated
      try {
        document.cookie =
          "gradefluxAuth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      } catch (e) {
        /* ignore */
      }

      // navigate to the login page
      router.push("/login");
      return;
    }

    // For internal routes use client-side navigation to avoid server middleware redirects
    if (pageLink.startsWith("/")) {
      // Special-case Home: if we have session/classes data, go straight to /home
      if (pageLink === "/home" || pageLink === "/") {
        const hasSession = !!localStorage.getItem("gradefluxSession");
        const hasSelected = !!localStorage.getItem("selectedClassDetails");
        if (hasSession || hasSelected) {
          // ensure middleware sees an auth cookie so server won't redirect to /login
          try {
            document.cookie = "gradefluxAuth=1; path=/";
          } catch (e) {
            /* ignore */
          }
          router.push("/home");
          return;
        }
        // otherwise let normal client navigation go to /login (handled elsewhere)
        router.push("/login");
        return;
      }

      // Generic internal navigation
      router.push(pageLink);
      return;
    }

    // External or non-path links fall back to full navigation
    window.location.href = pageLink;
  }

  return (
    <div
      className={`sidebar-element ${isActive ? "active" : ""}`}
      role="button"
      onClick={handleClick}
    >
      <Image src={icon} alt={label} width={24} height={24} />
      <p className="sidebar-label">{label}</p>
    </div>
  );
}
