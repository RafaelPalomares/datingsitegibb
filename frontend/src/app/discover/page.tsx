"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import { Match } from "@/lib/types";

export default function DiscoverPage(): JSX.Element {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/auth");
      return;
    }

    void loadMatches(token);
  }, [router]);

  async function loadMatches(token: string): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest<{ matches: Match[] }>("/matches", {
        method: "GET",
        token
      });

      setMatches(response.matches);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load matches";
      if (message.toLowerCase().includes("token")) {
        clearToken();
        router.push("/auth");
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Recommended Matches</h1>
        <p className="mt-2 text-sm text-ink/70">
          Ranked by shared famous persons, interests, places, and events from your graph context.
        </p>
      </div>

      {loading && <p className="text-sm text-ink/70">Finding people with shared context...</p>}
      {error && <p className="rounded-xl bg-red-100 px-4 py-2 text-sm text-red-700">{error}</p>}

      {!loading && matches.length === 0 && (
        <article className="rounded-2xl bg-white p-5 shadow-card">
          <p className="text-sm text-ink/75">
            No matches yet. Add more famous persons, events, places, and interests from your profile.
          </p>
        </article>
      )}

      <div className="grid gap-4">
        {matches.map((match) => (
          <article key={match.user.id} className="rounded-2xl bg-white p-5 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-ink">{match.user.name}</h2>
                <p className="text-sm text-ink/70">{match.user.location || "Location not set"}</p>
              </div>
              <span className="rounded-full bg-ocean px-3 py-1 text-xs font-semibold text-white">
                Score {match.score}
              </span>
            </div>
            <p className="mt-3 text-sm text-ink/80">{match.explanation}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[...match.commonFamousPersons, ...match.commonInterests, ...match.commonEvents, ...match.commonPlaces]
                .slice(0, 6)
                .map((item) => (
                  <span key={`${match.user.id}-${item}`} className="rounded-full bg-mist px-3 py-1 text-xs text-ink/80">
                    {item}
                  </span>
                ))}
            </div>
            <Link
              href={`/matches/${match.user.id}`}
              className="mt-4 inline-block rounded-xl bg-coral px-4 py-2 text-xs font-semibold text-white"
            >
              View match details
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
