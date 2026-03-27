import Link from "next/link";

export default function HomePage(): JSX.Element {
  return (
    <section className="space-y-8">
      <div className="rounded-3xl bg-gradient-to-br from-ocean to-ink p-6 text-white shadow-card sm:p-10">
        <p className="text-sm uppercase tracking-[0.2em] text-sun">Context-Based Dating</p>
        <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">
          Meet people through real shared moments.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-white/90 sm:text-lg">
          muduo connects you with people who listened to the same artists, attended similar events,
          explored familiar places, and care about the same interests.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/auth"
            className="rounded-full bg-coral px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Get started
          </Link>
          <Link
            href="/discover"
            className="rounded-full border border-white/40 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Explore matches
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl bg-white p-5 shadow-card">
          <h2 className="text-lg font-semibold text-ink">Shared Persons</h2>
          <p className="mt-2 text-sm text-ink/75">
            Connect over shared interests in famous people instead of random swipes.
          </p>
        </article>
        <article className="rounded-2xl bg-white p-5 shadow-card">
          <h2 className="text-lg font-semibold text-ink">Events & Places</h2>
          <p className="mt-2 text-sm text-ink/75">
            Discover people who have lived through the same festivals, cities, and scenes.
          </p>
        </article>
        <article className="rounded-2xl bg-white p-5 shadow-card">
          <h2 className="text-lg font-semibold text-ink">Transparent Matching</h2>
          <p className="mt-2 text-sm text-ink/75">
            Every recommendation includes an explanation of why you match.
          </p>
        </article>
      </div>
    </section>
  );
}
