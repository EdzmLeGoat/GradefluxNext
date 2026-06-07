import React, { useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import LoginPage from "./components/Login/LoginPage";

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (username: string, password: string) => {
    try {
      setLoading(true);
      const resp = await axios.post("/api/get-grades", {
        userID: username,
        password,
      });

      const data = resp?.data;
      if (!data) throw new Error("Empty response from authentication API");

      if (data.sessionData) {
        localStorage.setItem(
          "gradefluxSession",
          JSON.stringify(data.sessionData),
        );
      } else {
        localStorage.setItem(
          "gradefluxSession",
          JSON.stringify({ classes: data }),
        );
      }

      // set a short-lived cookie so server-side middleware can detect auth on refresh
      if (typeof document !== "undefined") {
        document.cookie = "gradefluxAuth=1; path=/; max-age=604800"; // 7 days
      }

      router.replace("/");
    } catch (err: any) {
      console.error(
        "Login failed:",
        err?.response?.data || err?.message || err,
      );
      alert(
        "Login failed: " +
          (err?.response?.data?.error || err?.message || "Unknown error"),
      );
    } finally {
      setLoading(false);
    }
  };

  return <LoginPage onSubmit={handleLogin} loading={loading} />;
}
