import "../src/index.css";
import "../src/App.css"; // apply local app styles including login form styles
import NextApp, { AppProps } from "next/app";
import type { AppContext } from "next/app";
import React, { useEffect, useState, useRef } from "react";
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

  // run-once guard for initial startup redirect
  const didRunStartupRedirect = React.useRef(false);

  useEffect(() => {
    // Run only on initial client mount. This avoids overriding navigation after login.
    if (didRunStartupRedirect.current) return;
    didRunStartupRedirect.current = true;

    if (typeof window === "undefined") return;

    try {
      const session = localStorage.getItem("gradefluxSession");
      if (session) {
        const parsed = JSON.parse(session || "null");

        const normalizeArrayToClassInfo = (arr: any[]): any[] =>
          arr.map((item: any, i: number) => {
            if (item && item.classCardProps) {
              return {
                classCardProps: item.classCardProps,
                classDetailsProps:
                  item.classDetailsProps || item.classCardProps,
              };
            }
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
          const uiNormalized = normalized.map(
            (n) =>
              (n.classDetailsProps
                ? n.classDetailsProps
                : n.classCardProps
                  ? n.classCardProps
                  : n) as ClassProps,
          );
          setClassProps(uiNormalized);
          try {
            setClassesStore(uiNormalized as ClassProps[]);
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
          try {
            setClassesStore(uiNormalized as ClassProps[]);
          } catch (e) {
            /* ignore */
          }
        }
      } else {
        try {
          setClassesStore([]);
        } catch (e) {
          /* ignore */
        }
      }
    } catch (e) {
      console.warn("Failed to parse session for classes:", e);
    }

    // Force the initial startup to go to login so server restarts can't bypass auth.
    if (router.pathname !== "/login") {
      setShowLogin(true);
      router.replace("/login");
      return;
    }
    setShowLogin(true);
  }, [router, processing]);

  const handleLogin = (username: string, password: string) => {
    // Authenticate against our Next API. Never persist the plain password in storage.
    (async () => {
      try {
        // Clear any previous persisted session data before attempting a fresh login.
        try {
          localStorage.removeItem("gradefluxSession");
        } catch (e) {
          /* ignore */
        }
        try {
          clearSessionStore();
        } catch (e) {
          /* ignore */
        }

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
        // set auth cookie so middleware and client checks recognize successful login
        try {
          document.cookie = "gradefluxAuth=1; path=/";
        } catch (e) {
          /* ignore */
        }
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
      {router.pathname === "/login" ? (
        <LoginPage onSubmit={handleLogin} loading={processing} />
      ) : (
        <div className="main-container">
          <Sidebar />
          <main className="main-content">{<Component {...pageProps} />}</main>
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
