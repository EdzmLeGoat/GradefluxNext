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

  // Zustand store setters
  const setClassesStore = useSessionStore((s) => s.setClasses);
  const clearSessionStore = useSessionStore((s) => s.clearSession);
  const setYearDataStore = useSessionStore((s) => (s as any).setYearData);

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

        // If stored shape looks like Semester[] (two semesters with interimOne/quarterOne keys), hydrate yearData
        if (
          Array.isArray(parsed) &&
          parsed.length === 2 &&
          (parsed[0]?.interimOne ||
            parsed[0]?.quarterOne ||
            parsed[0]?.interimTwo ||
            parsed[0]?.quarterTwo)
        ) {
          try {
            // store yearData in zustand
            setYearDataStore(parsed);
          } catch (e) {
            /* ignore */
          }

          // derive UI classes from latest non-empty marking period (same logic as store)
          const s1 =
            parsed[0] ||
            ({
              interimOne: [],
              quarterOne: [],
              interimTwo: [],
              quarterTwo: [],
            } as any);
          const s2 =
            parsed[1] ||
            ({
              interimOne: [],
              quarterOne: [],
              interimTwo: [],
              quarterTwo: [],
            } as any);
          const buckets = [
            s1.interimOne || [],
            s1.quarterOne || [],
            s1.interimTwo || [],
            s1.quarterTwo || [],
            s2.interimOne || [],
            s2.quarterOne || [],
            s2.interimTwo || [],
            s2.quarterTwo || [],
          ];
          let foundIndex: number | null = null;
          for (let i = buckets.length - 1; i >= 0; i--) {
            if (Array.isArray(buckets[i]) && buckets[i].length > 0) {
              foundIndex = i;
              break;
            }
          }
          console.log(
            "Found persisted session with yearData; derived classes from bucket index",
            foundIndex,
          );
          const selectedClasses =
            foundIndex !== null ? buckets[foundIndex] : [];
          setClassesStore(selectedClasses as ClassProps[]);
          // continue startup flow
          // (don't return here; allow login redirect logic below to decide navigation)
        }

        const parsedObj = parsed;

        // Force the initial startup to go to login so server restarts can't bypass auth.
        if (router.pathname !== "/login") {
          setShowLogin(true);
          router.replace("/login");
          return;
        }
        setShowLogin(true);
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

        // If API returned a Semester[] (two semesters), persist and set yearData
        if (
          Array.isArray(data) &&
          data.length === 2 &&
          (data[0]?.interimOne || data[0]?.quarterOne || data[1]?.interimOne)
        ) {
          try {
            localStorage.setItem(
              "gradefluxSession",
              JSON.stringify({ yearData: data }),
            );
          } catch (e) {
            /* ignore */
          }
          try {
            setYearDataStore(data);
            // derive latest classes for UI similar to store
            const s1 =
              data[0] ||
              ({
                interimOne: [],
                quarterOne: [],
                interimTwo: [],
                quarterTwo: [],
              } as any);
            const s2 =
              data[1] ||
              ({
                interimOne: [],
                quarterOne: [],
                interimTwo: [],
                quarterTwo: [],
              } as any);
            const buckets = [
              s1.interimOne || [],
              s1.quarterOne || [],
              s1.interimTwo || [],
              s1.quarterTwo || [],
              s2.interimOne || [],
              s2.quarterOne || [],
              s2.interimTwo || [],
              s2.quarterTwo || [],
            ];
            let foundIndex: number | null = null;
            for (let i = buckets.length - 1; i >= 0; i--) {
              if (Array.isArray(buckets[i]) && buckets[i].length > 0) {
                foundIndex = i;
                break;
              }
            }
            const selectedClasses =
              foundIndex !== null ? buckets[foundIndex] : [];
            setClassesStore(selectedClasses as ClassProps[]);
          } catch (e) {
            /* ignore */
          }
        } else {
          // If server provided explicit sessionData (from SAML relay), store that securely
          if (data.sessionData) {
            localStorage.setItem(
              "gradefluxSession",
              JSON.stringify(data.sessionData),
            );
            try {
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
            try {
              localStorage.setItem(
                "gradefluxSession",
                JSON.stringify({ classes: data }),
              );
            } catch (e) {
              /* ignore */
            }
            try {
              if (Array.isArray(data)) {
                setClassesStore(data as ClassProps[]);
              }
            } catch (e) {
              /* ignore */
            }
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
