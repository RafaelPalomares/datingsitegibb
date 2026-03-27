"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { setRole, setToken } from "@/lib/auth";
import { User } from "@/lib/types";

type Mode = "login" | "register";
type AuthResponse = {
  token: string;
  user: User;
};

export default function AuthPage(): JSX.Element {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [age, setAge] = useState("");
  const [location, setLocation] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        email,
        password
      };

      if (mode === "register") {
        payload.name = name;
        if (bio) payload.bio = bio;
        if (age) payload.age = Number(age);
        if (location) payload.location = location;
      }

      const response = await apiRequest<AuthResponse>(`/${mode === "register" ? "register" : "login"}`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setToken(response.token);
      setRole(response.user.role || "user");
      router.push("/profile");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unable to authenticate";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-xl rounded-3xl bg-white p-6 shadow-card sm:p-8">
      <div className="mb-6 flex rounded-full bg-mist p-1">
        <button
          type="button"
          className={`w-1/2 rounded-full px-4 py-2 text-sm font-semibold transition ${
            mode === "login" ? "bg-ocean text-white" : "text-ink/70"
          }`}
          onClick={() => setMode("login")}
        >
          Login
        </button>
        <button
          type="button"
          className={`w-1/2 rounded-full px-4 py-2 text-sm font-semibold transition ${
            mode === "register" ? "bg-ocean text-white" : "text-ink/70"
          }`}
          onClick={() => setMode("register")}
        >
          Register
        </button>
      </div>

      <h1 className="text-2xl font-bold text-ink">{mode === "login" ? "Welcome back" : "Create your muduo profile"}</h1>
      <p className="mt-2 text-sm text-ink/70">
        {mode === "login"
          ? "Log in to continue building real context-driven connections."
          : "Tell muduo about your experiences to unlock better matches."}
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        {mode === "register" && (
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-xl border border-ink/15 px-4 py-3 text-sm"
            placeholder="Name"
          />
        )}
        <input
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-xl border border-ink/15 px-4 py-3 text-sm"
          placeholder="Email"
        />
        <input
          required
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-ink/15 px-4 py-3 text-sm"
          placeholder="Password (min 8 chars)"
        />
        {mode === "register" && (
          <>
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              className="h-24 w-full rounded-xl border border-ink/15 px-4 py-3 text-sm"
              placeholder="Short bio"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="number"
                min={18}
                value={age}
                onChange={(event) => setAge(event.target.value)}
                className="w-full rounded-xl border border-ink/15 px-4 py-3 text-sm"
                placeholder="Age"
              />
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="w-full rounded-xl border border-ink/15 px-4 py-3 text-sm"
                placeholder="Location"
              />
            </div>
          </>
        )}
        {error && <p className="rounded-xl bg-red-100 px-4 py-2 text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-coral px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-50"
        >
          {loading ? "Please wait..." : mode === "login" ? "Login" : "Register"}
        </button>
      </form>
    </section>
  );
}
