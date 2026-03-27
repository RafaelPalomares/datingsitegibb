"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import { MatchExplanationResponse } from "@/lib/types";

export default function MatchDetailsPage(): JSX.Element {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [details, setDetails] = useState<MatchExplanationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.push("/auth");
      return;
    }

    if (!params?.id) {
      setLoading(false);
      setError("Missing match id");
      return;
    }

    void loadDetails(token, params.id);
  }, [params, router]);

  async function loadDetails(token: string, id: string): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest<MatchExplanationResponse>(`/match/${id}/explanation`, {
        method: "GET",
        token
      });

      setDetails(response);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Unable to load explanation";
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
    <section className="rounded-3xl bg-white p-6 shadow-card sm:p-8">
      {loading && <p className="text-sm text-ink/70">Loading match explanation...</p>}
      {error && <p className="rounded-xl bg-red-100 px-4 py-2 text-sm text-red-700">{error}</p>}

      {details && (
        <>
          <h1 className="text-2xl font-bold text-ink">{details.user.name}</h1>
          <p className="mt-1 text-sm text-ink/70">Match score: {details.score}</p>
          <p className="mt-4 rounded-2xl bg-mist p-4 text-sm text-ink/90">{details.explanation}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <ContextList label="Common Famous People" items={details.shared.commonFamousPersons} />
            <ContextList label="Common Interests" items={details.shared.commonInterests} />
            <ContextList label="Common Events" items={details.shared.commonEvents} />
            <ContextList label="Common Places" items={details.shared.commonPlaces} />
          </div>
        </>
      )}
    </section>
  );
}

function ContextList({ label, items }: { label: string; items: string[] }): JSX.Element {
  return (
    <article className="rounded-2xl border border-ink/10 p-4">
      <h2 className="text-sm font-semibold text-ink">{label}</h2>
      <ul className="mt-2 space-y-1">
        {items.length === 0 && <li className="text-xs text-ink/50">No overlap found</li>}
        {items.map((item) => (
          <li key={item} className="text-sm text-ink/80">
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}
