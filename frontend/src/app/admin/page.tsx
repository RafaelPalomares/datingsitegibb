"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { clearToken, getRole, getToken } from "@/lib/auth";
import { AdminOverviewResponse } from "@/lib/types";

export default function AdminPage(): JSX.Element {
  const router = useRouter();
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [backups, setBackups] = useState<Array<{ name: string; size: number; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    const role = getRole();

    if (!token) {
      router.push("/auth");
      return;
    }

    if (role === "user") {
      router.push("/discover");
      return;
    }

    void loadOverview(token);
    void loadBackups(token);
  }, [router]);

  async function loadBackups(token: string): Promise<void> {
    try {
      const data = await apiRequest<{ backups: Array<{ name: string; size: number; createdAt: string }> }>("/admin/backups", {
        method: "GET",
        token
      });
      setBackups(data.backups);
    } catch (err) {
      console.error("Failed to load backups", err);
    }
  }

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  async function loadOverview(token: string): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const data = await apiRequest<AdminOverviewResponse>("/admin/overview", {
        method: "GET",
        token
      });

      setOverview(data);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load admin overview";

      if (message.toLowerCase().includes("token")) {
        clearToken();
        router.push("/auth");
        return;
      }

      if (message.toLowerCase().includes("admin")) {
        router.push("/discover");
        return;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-ink/70">Loading admin overview...</p>;
  }

  if (error) {
    return <p className="rounded-xl bg-red-100 px-4 py-2 text-sm text-red-700">{error}</p>;
  }

  if (!overview) {
    return <p className="text-sm text-ink/70">No admin data available.</p>;
  }

  const summaryItems = [
    { label: "Users total", value: overview.summary.totalUsers },
    { label: "Admins", value: overview.summary.adminUsers },
    { label: "Regular users", value: overview.summary.regularUsers },
    { label: "Relationships", value: overview.summary.relationships },
    { label: "Famous persons", value: overview.summary.famousPersons },
    { label: "Interests", value: overview.summary.interests },
    { label: "Events", value: overview.summary.events },
    { label: "Places", value: overview.summary.places }
  ];

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Admin Overview</h1>
        <p className="mt-2 text-sm text-ink/70">
          Use this view to demonstrate role-based access and inspect seeded graph data.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryItems.map((item) => (
          <article key={item.label} className="rounded-2xl bg-white p-5 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">{item.label}</p>
            <p className="mt-3 text-3xl font-bold text-ocean">{item.value}</p>
          </article>
        ))}
      </div>

      <article className="rounded-2xl bg-white p-5 shadow-card">
        <h2 className="text-lg font-semibold text-ink">Neo4j shards</h2>
        <p className="mt-1 text-sm text-ink/60">Distribution across the three database nodes used for horizontal scaling.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {overview.shards.map((shard) => (
            <div key={shard.shardId} className="rounded-2xl bg-mist p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">{shard.shardId}</p>
              <div className="mt-3 space-y-2 text-sm text-ink/75">
                <p>Users: {shard.users}</p>
                <p>Relationships: {shard.relationships}</p>
                <p>Famous persons: {shard.famousPersons}</p>
                <p>Interests: {shard.interests}</p>
                <p>Events: {shard.events}</p>
                <p>Places: {shard.places}</p>
              </div>
            </div>
          ))}
        </div>
      </article>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl bg-white p-5 shadow-card">
          <h2 className="text-lg font-semibold text-ink">Top famous persons</h2>
          <ul className="mt-4 space-y-3">
            {overview.topFamousPersons.map((entry) => (
              <li key={entry.name} className="flex items-center justify-between text-sm text-ink/80">
                <span>{entry.name}</span>
                <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-ink/70">{entry.total}</span>
              </li>
            ))}
            {overview.topFamousPersons.length === 0 && <li className="text-sm text-ink/50">No data yet</li>}
          </ul>
        </article>

        <article className="rounded-2xl bg-white p-5 shadow-card">
          <h2 className="text-lg font-semibold text-ink">Top interests</h2>
          <ul className="mt-4 space-y-3">
            {overview.topInterests.map((entry) => (
              <li key={entry.name} className="flex items-center justify-between text-sm text-ink/80">
                <span>{entry.name}</span>
                <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-ink/70">{entry.total}</span>
              </li>
            ))}
            {overview.topInterests.length === 0 && <li className="text-sm text-ink/50">No data yet</li>}
          </ul>
        </article>
      </div>

      <article className="rounded-2xl bg-white p-5 shadow-card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Recent users</h2>
            <p className="mt-1 text-sm text-ink/60">Shows roles, locations and whether the account is seeded demo data.</p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-ink/50">
                <th className="px-2 py-3 font-semibold">Name</th>
                <th className="px-2 py-3 font-semibold">Email</th>
                <th className="px-2 py-3 font-semibold">Role</th>
                <th className="px-2 py-3 font-semibold">Shard</th>
                <th className="px-2 py-3 font-semibold">Location</th>
                <th className="px-2 py-3 font-semibold">Seeded</th>
              </tr>
            </thead>
            <tbody>
              {overview.recentUsers.map((user) => (
                <tr key={user.id} className="border-b border-ink/5 text-ink/80">
                  <td className="px-2 py-3">{user.name || "Unknown"}</td>
                  <td className="px-2 py-3">{user.email}</td>
                  <td className="px-2 py-3 capitalize">{user.role}</td>
                  <td className="px-2 py-3">{user.shardId}</td>
                  <td className="px-2 py-3">{user.location || "-"}</td>
                  <td className="px-2 py-3">{user.seeded ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="rounded-2xl bg-white p-5 shadow-card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Database Backups</h2>
            <p className="mt-1 text-sm text-ink/60">List of multi-node Neo4j dumps stored in the backup volume.</p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-ink/50">
                <th className="px-2 py-3 font-semibold">Filename</th>
                <th className="px-2 py-3 font-semibold">Size</th>
                <th className="px-2 py-3 font-semibold">Created at</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={backup.name} className="border-b border-ink/5 text-ink/80">
                  <td className="px-2 py-3 font-mono text-xs">{backup.name}</td>
                  <td className="px-2 py-3">{formatSize(backup.size)}</td>
                  <td className="px-2 py-3">{new Date(backup.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {backups.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-2 py-4 text-center text-ink/50 italic">
                    No backups found in directory.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 rounded-xl bg-ocean/5 p-4 border border-ocean/10">
          <h3 className="text-sm font-bold text-ocean">How to Restore</h3>
          <p className="mt-2 text-xs text-ink/75 leading-relaxed">
            Restoring requires stopping the containers. Run the following command from your project root:
          </p>
          <code className="mt-2 block bg-white p-3 rounded-lg text-xs font-mono border border-ink/5 overflow-x-auto">
            bash scripts/restore-neo4j.sh backup/
          </code>
        </div>
      </article>
    </section>
  );
}
