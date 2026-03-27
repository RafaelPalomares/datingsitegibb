"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { clearToken, getToken, setRole } from "@/lib/auth";
import { MeResponse } from "@/lib/types";
import SuggestionInput from "@/components/SuggestionInput";

type ActionEndpoint = "/like-person" | "/visit-place" | "/attend-event" | "/add-interest";

export default function ProfilePage(): JSX.Element {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [age, setAge] = useState("");
  const [location, setLocation] = useState("");
  const [gender, setGender] = useState("");
  const [prefGender, setPrefGender] = useState("");
  const [occupation, setOccupation] = useState("");
  const [education, setEducation] = useState("");

  useEffect(() => {
    const existingToken = getToken();

    if (!existingToken) {
      router.push("/auth");
      return;
    }

    setToken(existingToken);
  }, [router]);

  useEffect(() => {
    if (!token) {
      return;
    }

    void loadProfile(token);
  }, [token]);

  async function loadProfile(authToken: string): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const data = await apiRequest<MeResponse>("/me", {
        method: "GET",
        token: authToken
      });

      setProfile(data);
      setRole(data.user.role || "user");
      setName(data.user.name || "");
      setBio(data.user.bio || "");
      setAge(data.user.age ? String(data.user.age) : "");
      setLocation(data.user.location || "");
      setGender(data.user.gender || "");
      setPrefGender(data.user.prefGender || "");
      setOccupation(data.user.occupation || "");
      setEducation(data.user.education || "");
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load profile";
      if (message.toLowerCase().includes("token")) {
        clearToken();
        router.push("/auth");
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleProfileSave(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!token) {
      return;
    }

    setSaving(true);
    setStatus(null);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        name,
        bio,
        location,
        gender: gender || null,
        prefGender: prefGender || null,
        occupation,
        education
      };

      payload.age = age ? Number(age) : null;

      await apiRequest<{ user: unknown }>("/profile", {
        method: "PUT",
        token,
        body: JSON.stringify(payload)
      });

      setStatus("Profile updated.");
      await loadProfile(token);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not update profile");
    } finally {
      setSaving(false);
    }
  }

  async function addContext(endpoint: ActionEndpoint, value: string): Promise<void> {
    if (!token || !value.trim()) {
      return;
    }

    setError(null);
    setStatus(null);

    try {
      await apiRequest(endpoint, {
        method: "POST",
        token,
        body: JSON.stringify({ name: value })
      });

      setStatus("Context added to your profile.");
      await loadProfile(token);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to add item");
    }
  }

  async function updateContext(endpoint: ActionEndpoint, currentValue: string): Promise<void> {
    if (!token) {
      return;
    }

    const nextValue = window.prompt(`Update "${currentValue}"`, currentValue)?.trim();

    if (!nextValue || nextValue === currentValue.trim()) {
      return;
    }

    setError(null);
    setStatus(null);

    try {
      await apiRequest(endpoint, {
        method: "PUT",
        token,
        body: JSON.stringify({
          currentName: currentValue,
          newName: nextValue
        })
      });

      setStatus("Context updated.");
      await loadProfile(token);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update item");
    }
  }

  async function removeContext(endpoint: ActionEndpoint, value: string): Promise<void> {
    if (!token) {
      return;
    }

    const confirmed = window.confirm(`Remove "${value}" from your profile?`);

    if (!confirmed) {
      return;
    }

    setError(null);
    setStatus(null);

    try {
      await apiRequest(endpoint, {
        method: "DELETE",
        token,
        body: JSON.stringify({ name: value })
      });

      setStatus("Context removed.");
      await loadProfile(token);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to remove item");
    }
  }

  async function handleDeleteAccount(): Promise<void> {
    if (!token) {
      return;
    }

    const confirmed = window.confirm("Delete your account permanently? This cannot be undone.");

    if (!confirmed) {
      return;
    }

    setDeletingAccount(true);
    setError(null);
    setStatus(null);

    try {
      await apiRequest("/me", {
        method: "DELETE",
        token
      });

      clearToken();
      router.push("/auth");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete account");
    } finally {
      setDeletingAccount(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-ink/70">Loading profile...</p>;
  }

  if (!profile) {
    return <p className="text-sm text-red-600">Unable to load profile.</p>;
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-card sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink">Your Profile</h1>
            <p className="mt-2 text-sm text-ink/70">Keep your profile fresh so matching stays relevant.</p>
          </div>
          <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink/70">
            {profile.user.role || "user"}
          </span>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleProfileSave}>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-xl border border-ink/15 px-4 py-3 text-sm"
            placeholder="Name"
          />
          <textarea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            className="h-24 w-full rounded-xl border border-ink/15 px-4 py-3 text-sm"
            placeholder="Bio"
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
          <div className="grid gap-4 sm:grid-cols-2">
            <select
              value={gender}
              onChange={(event) => setGender(event.target.value)}
              className="w-full rounded-xl border border-ink/15 px-4 py-3 text-sm"
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Non-binary">Non-binary</option>
              <option value="Other">Other</option>
            </select>
            <select
              value={prefGender}
              onChange={(event) => setPrefGender(event.target.value)}
              className="w-full rounded-xl border border-ink/15 px-4 py-3 text-sm"
            >
              <option value="">Preferred Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Non-binary">Non-binary</option>
              <option value="Other">Other</option>
              <option value="Any">Any</option>
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              value={occupation}
              onChange={(event) => setOccupation(event.target.value)}
              className="w-full rounded-xl border border-ink/15 px-4 py-3 text-sm"
              placeholder="Occupation"
            />
            <input
              value={education}
              onChange={(event) => setEducation(event.target.value)}
              className="w-full rounded-xl border border-ink/15 px-4 py-3 text-sm"
              placeholder="Education"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-ocean px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save profile"}
          </button>
        </form>

        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-4">
          <h2 className="text-sm font-semibold text-red-800">Danger zone</h2>
          <p className="mt-2 text-sm text-red-700">Delete your account and remove your user node and relationships.</p>
          <button
            type="button"
            onClick={() => {
              void handleDeleteAccount();
            }}
            disabled={deletingAccount}
            className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {deletingAccount ? "Deleting..." : "Delete account"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ContextBox
          title="Famous People"
          label="FamousPerson"
          endpoint="/like-person"
          items={profile.famousPersons}
          onAdd={addContext}
          onEdit={updateContext}
          onRemove={removeContext}
          placeholder="e.g. Elon Musk"
        />
        <ContextBox
          title="Interests"
          label="Interest"
          endpoint="/add-interest"
          items={profile.interests}
          onAdd={addContext}
          onEdit={updateContext}
          onRemove={removeContext}
          placeholder="e.g. Photography"
        />
        <ContextBox
          title="Visited Places"
          label="Place"
          endpoint="/visit-place"
          items={profile.places}
          onAdd={addContext}
          onEdit={updateContext}
          onRemove={removeContext}
          placeholder="e.g. Berlin"
        />
        <ContextBox
          title="Attended Events"
          label="Event"
          endpoint="/attend-event"
          items={profile.events}
          onAdd={addContext}
          onEdit={updateContext}
          onRemove={removeContext}
          placeholder="e.g. Sziget Festival"
        />
      </div>

      {status && <p className="rounded-xl bg-green-100 px-4 py-2 text-sm text-green-700">{status}</p>}
      {error && <p className="rounded-xl bg-red-100 px-4 py-2 text-sm text-red-700">{error}</p>}
    </section>
  );
}

function ContextBox({
  title,
  label,
  endpoint,
  items,
  onAdd,
  onEdit,
  onRemove,
  placeholder
}: {
  title: string;
  label: "FamousPerson" | "Place" | "Event" | "Interest";
  endpoint: ActionEndpoint;
  items: string[];
  onAdd: (endpoint: ActionEndpoint, value: string) => Promise<void>;
  onEdit: (endpoint: ActionEndpoint, value: string) => Promise<void>;
  onRemove: (endpoint: ActionEndpoint, value: string) => Promise<void>;
  placeholder: string;
}): JSX.Element {
  const [value, setValue] = useState("");

  return (
    <article className="rounded-2xl bg-white p-5 shadow-card">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <div className="mt-3 flex gap-2">
        <SuggestionInput
          type={label}
          value={value}
          onChange={setValue}
          onSelect={(val) => {
            setValue(val);
          }}
          placeholder={placeholder}
        />
        <button
          type="button"
          className="rounded-xl bg-coral px-3 py-2 text-xs font-semibold text-white"
          onClick={async () => {
            await onAdd(endpoint, value);
            setValue("");
          }}
        >
          Add
        </button>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {items.length === 0 && <li className="text-xs text-ink/50">No items yet</li>}
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2 rounded-full bg-mist px-3 py-1 text-xs text-ink/80">
            <span>{item}</span>
            <button
              type="button"
              className="font-semibold text-ocean"
              onClick={() => {
                void onEdit(endpoint, item);
              }}
            >
              Edit
            </button>
            <button
              type="button"
              className="font-semibold text-red-600"
              onClick={() => {
                void onRemove(endpoint, item);
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </article>
  );
}
