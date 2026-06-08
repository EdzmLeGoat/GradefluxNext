import "../src/index.css";
import "../src/App.css"; // apply local app styles including login form styles
import NextApp, { AppProps } from "next/app";
import type { AppContext } from "next/app";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import LoginPage from "./components/Login/LoginPage";
import Header from "./components/Main/Header/Header";
import Sidebar from "./components/Main/Sidebar/Sidebar";
import ClassListPage from "./components/ClassList/ClassListPage";
import useSessionStore from "../src/stores/useSessionStore";
import type { ClassProps } from "../src/types/Grades";

export default function MyApp({
  Component,
  pageProps,
}: AppProps & { pageProps: any }) {
  const initialClassInfo = pageProps?.initialClassInfo;
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [credentials, setCredentials] = useState<{
    username?: string;
    password?: string;
  } | null>(null);
  // now we store the app's classes as ClassProps objects
  const [classProps, setClassProps] = useState<ClassProps[] | null>(null);

  // Zustand store setters
  const setClassesStore = useSessionStore((s) => s.setClasses);
  const clearSessionStore = useSessionStore((s) => s.clearSession);

  useEffect(() => {
    // run only on client
    const session =
      typeof window !== "undefined"
        ? localStorage.getItem("gradefluxSession")
        : null;
    const pathname = router.pathname;

    // If there's no session, require the dedicated login route
    if (!session) {
      // clear any existing classes in the global store
      try {
        setClassesStore([]);
      } catch (e) {
        /* ignore */
      }

      if (pathname === "/login") {
        setShowLogin(true);
      } else {
        // redirect user to dedicated login route
        router.replace("/login");
        setShowLogin(false);
      }
      return;
    }

    // We have a session in localStorage — try to hydrate classCardProps from it or from initialClassInfo
    try {
      const parsed = JSON.parse(session || "null");
      console.log("Parsed session data:", parsed);

      const normalizeArrayToClassInfo = (arr: any[]): any[] =>
        arr.map((item: any, i: number) => {
          // If item already looks like a ClassInfo wrapper, keep it but ensure both fields exist
          if (item && item.classCardProps) {
            return {
              classCardProps: item.classCardProps,
              classDetailsProps: item.classDetailsProps || item.classCardProps,
            };
          }

          // If item looks like ClassDetailsProps, build a safe classCardProps from it
          const details = item || {};
          const card = {
            classTitle: details.classTitle || `Class ${i + 1}`,
            teacherName: details.teacherName || "",
            periodNumber: details.periodNumber || String(i + 1),
            gradeLetter: details.gradeLetter ?? "N/A",
            gradeNumber:
              typeof details.gradeNumber === "number"
                ? details.gradeNumber
                : (details.gradeNumber ?? "N/A"),
            semLetter: details.semLetter ?? "N/A",
            semNumber:
              typeof details.semNumber === "number"
                ? details.semNumber
                : (details.semNumber ?? "N/A"),
          };

          return {
            classCardProps: card,
            classDetailsProps: details,
          };
        });

      // The persisted shape may be one of several forms depending on how it was saved:
      // - { classes: [...] }
      // - { state: { classes: [...] } } (zustand persist)
      // - raw array [...] or other wrappers
      const candidates = [
        parsed?.classes,
        parsed?.state?.classes,
        parsed?.sessionData?.classes,
        parsed?.data,
      ];
      let raw: any[] | null = null;
      for (const c of candidates) {
        if (Array.isArray(c)) {
          raw = c as any[];
          break;
        }
      }
      if (!raw && Array.isArray(parsed)) raw = parsed as any[];

      if (raw) {
        const normalized = normalizeArrayToClassInfo(raw);
        // normalized is an array of wrappers; extract ClassProps entries for UI and store
        const uiNormalized = normalized.map(
          (n) =>
            (n.classDetailsProps
              ? n.classDetailsProps
              : n.classCardProps
                ? n.classCardProps
                : n) as ClassProps,
        );
        setClassProps(uiNormalized);
        // Convert normalized entries into ClassProps objects for the store
        const classesForStore = uiNormalized;
        try {
          setClassesStore(classesForStore as ClassProps[]);
        } catch (e) {
          /* ignore */
        }
      } else if (initialClassInfo && Array.isArray(initialClassInfo)) {
        const raw2 = initialClassInfo as any[];
        const normalized = normalizeArrayToClassInfo(raw2);
        const uiNormalized = normalized.map(
          (n) =>
            (n.classDetailsProps
              ? n.classDetailsProps
              : n.classCardProps
                ? n.classCardProps
                : n) as ClassProps,
        );
        setClassProps(uiNormalized);
        const classesForStore = uiNormalized;
        try {
          setClassesStore(classesForStore as ClassProps[]);
        } catch (e) {
          /* ignore */
        }
      }
    } catch (e) {
      console.warn("Failed to parse session for classes:", e);
    }

    // we have a session; only redirect away from /login if both session and auth cookie exist
    if (pathname === "/login") {
      const hasAuthCookie =
        typeof document !== "undefined" &&
        document.cookie.includes("gradefluxAuth=1");
      if (hasAuthCookie) {
        router.replace("/");
      } else {
        // keep showing the login page until the user submits
        setShowLogin(true);
        return;
      }
    }
    setShowLogin(false);
  }, [router, processing]);

  const handleLogin = (username: string, password: string) => {
    // Authenticate against our Next API. Never persist the plain password in storage.
    (async () => {
      try {
        setProcessing(true);
        // POST credentials to our server API which will perform SOAP/SAML exchange
        const resp = await axios.post("/api/get-grades", {
          userID: username,
          password,
        });

        // Server may return sessionData (cookies, studentGU) or parsed class info.
        const data = resp?.data;
        if (!data) throw new Error("Empty response from authentication API");

        // If server provided explicit sessionData (from SAML relay), store that securely (no password)
        if (data.sessionData) {
          localStorage.setItem(
            "gradefluxSession",
            JSON.stringify(data.sessionData),
          );
          try {
            // hydrate store if sessionData includes classes
            if (
              data.sessionData.classes &&
              Array.isArray(data.sessionData.classes)
            ) {
              setClassesStore(data.sessionData.classes as ClassProps[]);
            }
          } catch (e) {
            /* ignore */
          }
        } else {
          // Otherwise, assume the API returned parsed class info; store under classes key.
          localStorage.setItem(
            "gradefluxSession",
            JSON.stringify({ classes: data }),
          );
          try {
            if (Array.isArray(data)) setClassesStore(data as ClassProps[]);
          } catch (e) {
            /* ignore */
          }
        }

        // clear any in-memory credentials and advance into the app
        setCredentials(null);
        setShowLogin(false);
        router.replace("/home");
      } catch (err: any) {
        console.error(
          "Login failed:",
          err?.response?.data || err?.message || err,
        );
        // show a minimal alert; in future use UI state to display errors
        alert(
          "Login failed: " +
            (err?.response?.data?.error || err?.message || "Unknown error"),
        );
      } finally {
        setProcessing(false);
      }
    })();
  };

  return (
    <>
      <Header />
      {showLogin && router.pathname === "/login" ? (
        <LoginPage onSubmit={handleLogin} loading={processing} />
      ) : (
        <div className="main-container">
          <Sidebar />
          <main className="main-content">
            {/* page content rendered by Next - prefer ClassList when classes available */}
            {router.pathname.startsWith("/class-details") ? (
              // dynamic class-details route should render the page component
              <Component {...pageProps} />
            ) : classProps && classProps.length ? (
              <ClassListPage classProps={classProps} />
            ) : (
              <Component {...pageProps} />
            )}
          </main>
        </div>
      )}
    </>
  );
}

MyApp.getInitialProps = async (appContext: AppContext) => {
  // Call the original App.getInitialProps to preserve pageProps from pages
  const appProps = await NextApp.getInitialProps(appContext as any);

  // No test fetch here; return the appProps unmodified.
  return {
    ...appProps,
    pageProps: {
      ...appProps.pageProps,
    },
  };
};
