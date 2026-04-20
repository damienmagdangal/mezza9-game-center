export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0f1112] px-4 py-10 text-white">
      <section className="mx-auto max-w-2xl space-y-4 rounded-xl border border-zinc-700 bg-zinc-900/60 p-6">
        <h1 className="text-2xl font-bold text-cyan-300">Mezza9 Terms & House Rules</h1>
        <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-200">
          <li>A 15-minute grace period applies. After this, the reservation may be forfeited.</li>
          <li>No-show reservations may be marked as forfeited and table reassigned.</li>
          <li>Players are responsible for proper use of cues, balls, and table cloth.</li>
          <li>Damages due to misuse may be charged to the booking customer.</li>
          <li>Staff may override table status for walk-ins and operational needs.</li>
        </ul>
      </section>
    </main>
  );
}
