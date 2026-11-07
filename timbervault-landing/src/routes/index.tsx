import { createFileRoute } from "@tanstack/react-router";
import hero from "@/assets/hero-workshop.jpg";
import qr from "@/assets/qr-label.jpg";
import offcuts from "@/assets/offcuts.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TimberVault — Timber inventory, QR labels & cut planning" },
      { name: "description", content: "Organise your timber inventory, track every board and offcut, plan cuts and reduce waste." },
      { property: "og:title", content: "TimberVault — Know what timber you have" },
      { property: "og:description", content: "Track every board and offcut, plan cuts, reduce waste. Less searching. More making." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const btn = "inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-bold transition-colors";
const btnPrimary = `${btn} bg-primary text-primary-foreground hover:bg-primary/90`;
const btnGhost = `${btn} border border-bark-foreground/40 text-bark-foreground hover:bg-bark-foreground/10`;

const features = [
  { tag: "A", title: "Know exactly what's in your workshop.", name: "Timber inventory management",
    body: "Record and organise your timber inventory with the details that matter.",
    list: ["Wood species", "Length, width and thickness", "Timber source", "Storage location", "Stock identification", "Individual boards and offcuts", "Batch management for multiple pieces"],
    foot: "No more guessing. No more rummaging through piles of timber." },
  { tag: "B", title: "Give every board a digital identity.", name: "QR identification", img: qr,
    body: "Generate and print labels that connect physical timber to its digital inventory record. Scan the label and find the record.",
    list: ["Unique stock ID", "Timber species", "Dimensions", "Source", "Storage location", "QR code for quick retrieval"],
    foot: "Your timber is physically labelled and digitally organised." },
  { tag: "C", title: "Make better use of every board.", name: "Intelligent cut-list & nesting",
    body: "Plan how components can be cut from available stock — making smarter use of the material already in your workshop.",
    list: ["Required component dimensions", "Available board sizes", "Timber thickness", "Cutting sequences", "Material utilisation", "Remaining usable offcuts"],
    foot: "Use timber intelligently while retaining useful material for the next project." },
  { tag: "D", title: "Turn forgotten offcuts into your next project.", name: "What Can I Build?", img: offcuts,
    body: "Stop seeing offcuts as waste. Explore possible projects using the timber you already have.",
    list: ["A small shelving unit", "A workshop organiser", "A wooden storage box", "A stool or side table", "Components for a larger project"],
    foot: "Your next project might already be sitting in your workshop." },
  { tag: "E", title: "Let your camera help identify your timber.", name: "Camera-assisted recognition",
    body: "Photograph a board or a collection and get image-assisted suggestions. You review, correct and decide what gets saved.",
    list: ["Likely wood species", "Visible knots and defects", "Timber characteristics", "Potential classifications", "Suggested dimensions where reliably detectable"],
    foot: "TimberVault never pretends an uncertain identification is a fact." },
  { tag: "F", title: "Know where everything lives.", name: "Workshop storage",
    body: "Organise inventory by storage location — rack, shelf, workbench or storage area — and keep it connected to its physical place.",
    list: ["Racks", "Shelves", "Workbenches", "Storage areas"],
    foot: "Find what you need without searching the entire workshop." },
];

const audiences = [
  ["Professional woodworkers", "Manage stock, track material usage, organise offcuts and improve workshop efficiency."],
  ["Cabinetmakers & furniture makers", "Keep track of material dimensions, plan components and make better use of available timber."],
  ["DIY enthusiasts & hobbyists", "Bring order to growing timber collections, organise leftovers and discover new uses for existing material."],
  ["Small workshops & makers", "Keep inventory accessible and material organised without complicated enterprise software."],
];

const compare = [
  ["Generic stock records", "Timber-specific records"],
  ["Stock quantities", "Individual boards and offcuts"],
  ["Manual identification", "QR-coded timber labels"],
  ["Basic inventory", "Cutting and nesting tools"],
  ["Generic categories", "Wood species and dimensions"],
  ["Static records", "Workshop-focused workflows"],
];

const faqs = [
  ["Do I need to be a professional woodworker?", "No. TimberVault is intended for anyone who works with timber, from professional makers to DIY enthusiasts."],
  ["Can I record individual offcuts?", "Yes. TimberVault is designed to manage individual pieces as well as batches of timber."],
  ["Can I print labels?", "Yes. TimberVault supports QR-coded timber labels, including printing through compatible thermal printers such as the MXW-01."],
  ["Can I scan a timber label?", "Yes. The QR identification workflow allows you to scan a label and retrieve the corresponding inventory record."],
  ["Can TimberVault help me plan cuts?", "Yes. Its cutting and nesting functionality helps plan component layouts and make more intelligent use of available stock."],
  ["Does it identify wood species from photographs?", "Camera-assisted recognition is intended to provide suggestions, not guaranteed identification. Users should review and confirm results."],
  ["Do I need complicated inventory software?", "No. TimberVault provides practical workshop tools without the overhead of a large business management system."],
];

function Index() {
  return (
    <main>
      {/* Hero */}
      <section className="relative min-h-[92vh] overflow-hidden bg-bark text-bark-foreground">
        <img src={hero} alt="Timber racks with QR-labelled boards" width={1600} height={1008} className="absolute inset-0 h-full w-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-r from-bark via-bark/80 to-transparent" />
        <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <span className="font-display text-2xl">TimberVault</span>
          <a href="#start" className={btnPrimary}>Get Started</a>
        </nav>
        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-16 md:pt-28">
          <p className="eyebrow">Your timber. Your offcuts. Your projects.</p>
          <h1 className="mt-6 max-w-3xl text-5xl leading-[1.05] md:text-7xl">Know what timber you have. Know what you can make.</h1>
          <p className="mt-6 max-w-xl text-lg text-bark-foreground/80">
            TimberVault helps woodworkers organise their timber inventory, track every board and offcut, plan cuts, reduce waste and make better use of the wood they already own.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-widest text-bark-foreground/70">
            {["Timber inventory", "QR identification", "Cut planning"].map((t) => (
              <span key={t} className="rounded-full border border-bark-foreground/30 px-3 py-1">{t}</span>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <a href="#start" className={btnPrimary}>Get Started</a>
            <a href="#features" className={btnGhost}>Explore TimberVault</a>
          </div>
          <p className="mt-10 font-display text-xl italic text-bark-foreground/80">Less searching. Less waste. More making.</p>
        </div>
      </section>

      {/* Problem */}
      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-24 md:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="eyebrow">The problem</p>
          <h2 className="mt-4 text-4xl md:text-5xl">How much timber do you actually have?</h2>
        </div>
        <div className="space-y-5 text-lg text-muted-foreground">
          <p>If you're anything like most woodworkers, you probably have more timber than you think.</p>
          <p>Boards stacked against walls. Offcuts tucked under benches. Useful pieces hiding behind other useful pieces. Timber you bought months ago and completely forgot about.</p>
          <p>You know there's a piece somewhere that would be perfect for your next project. You just can't remember where you put it — and when you find it, it might be too short, too narrow or unsuitable.</p>
          <p className="font-display text-2xl text-foreground">The problem isn't that you need more timber. It's that you don't have a clear picture of what you've already got.</p>
          <p className="font-bold text-primary">TimberVault changes that.</p>
        </div>
      </section>

      {/* Solution */}
      <section className="bg-secondary">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <p className="eyebrow">The solution</p>
          <h2 className="mt-4 text-4xl md:text-5xl">Your workshop deserves a better memory.</h2>
          <p className="mt-6 text-lg text-muted-foreground">
            A central place to manage your timber inventory, from full-length boards to the smallest useful offcuts. Record what you have, where it's stored, what it's made from and what dimensions are available.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {["Give every piece its own identity.", "Find it when you need it.", "Check what you own before buying more."].map((t) => (
              <div key={t} className="rounded-lg border bg-card p-6 font-display text-lg">{t}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <p className="eyebrow">Features</p>
        <h2 className="mt-4 max-w-2xl text-4xl md:text-5xl">What TimberVault actually does.</h2>
        <div className="mt-16 space-y-20">
          {features.map((f, i) => (
            <article key={f.tag} className={`grid items-center gap-10 md:grid-cols-2 ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}>
              <div>
                <p className="eyebrow">{f.tag} · {f.name}</p>
                <h3 className="mt-3 text-3xl md:text-4xl">{f.title}</h3>
                <p className="mt-4 text-muted-foreground">{f.body}</p>
                <p className="mt-6 font-display text-lg italic">{f.foot}</p>
              </div>
              {f.img ? (
                <div>
                  <img src={f.img} alt={f.name} loading="lazy" width={1200} height={912} className="rounded-lg object-cover shadow-xl" />
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {f.list.map((l) => <li key={l} className="rounded-full bg-muted px-3 py-1 text-sm">{l}</li>)}
                  </ul>
                </div>
              ) : (
                <ul className="divide-y rounded-lg border bg-card">
                  {f.list.map((l, j) => (
                    <li key={l} className="flex items-center gap-4 px-6 py-4">
                      <span className="font-display text-primary">{String(j + 1).padStart(2, "0")}</span>
                      <span>{l}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* Bigger idea */}
      <section className="bg-bark text-bark-foreground">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <p className="eyebrow">The bigger idea</p>
          <h2 className="mt-4 max-w-3xl text-4xl md:text-6xl">Stop buying timber you might already have.</h2>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {[["Before buying more,", "check your inventory."], ["Before throwing something away,", "see whether it has another use."], ["Before cutting,", "plan how to get the most from your stock."]].map(([a, b]) => (
              <div key={a} className="border-t border-bark-foreground/25 pt-6">
                <p className="text-bark-foreground/60">{a}</p>
                <p className="mt-1 font-display text-2xl">{b}</p>
              </div>
            ))}
          </div>
          <p className="mt-14 text-lg text-bark-foreground/80">Better organisation. Better decisions. Less unnecessary waste.</p>
        </div>
      </section>

      {/* Audience */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <p className="eyebrow">Who it's for</p>
        <h2 className="mt-4 text-4xl md:text-5xl">Who is TimberVault for?</h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {audiences.map(([t, d]) => (
            <div key={t} className="rounded-lg border bg-card p-6">
              <h3 className="text-xl">{t}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why */}
      <section className="bg-secondary">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 md:grid-cols-2">
          <div>
            <p className="eyebrow">Why TimberVault?</p>
            <h2 className="mt-4 text-4xl md:text-5xl">Built around the way woodworkers actually work.</h2>
            <p className="mt-6 text-muted-foreground">Most inventory software is designed around products, quantities and sales. TimberVault is designed around timber. A board isn't just another stock item — its species, thickness, dimensions, condition, location and remaining usable material all matter.</p>
          </div>
          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="grid grid-cols-2 bg-bark text-sm font-bold text-bark-foreground">
              <div className="px-5 py-3">Typical inventory software</div>
              <div className="px-5 py-3 text-primary">TimberVault</div>
            </div>
            {compare.map(([a, b]) => (
              <div key={a} className="grid grid-cols-2 border-t text-sm">
                <div className="px-5 py-4 text-muted-foreground line-through decoration-border">{a}</div>
                <div className="px-5 py-4 font-bold">{b}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-24">
        <p className="eyebrow">FAQ</p>
        <h2 className="mt-4 text-4xl md:text-5xl">Frequently asked questions</h2>
        <div className="mt-10 divide-y border-y">
          {faqs.map(([q, a]) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-display text-xl">
                {q}<span className="text-primary transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="start" className="relative overflow-hidden bg-bark text-bark-foreground">
        <img src={hero} alt="" loading="lazy" width={1600} height={1008} className="absolute inset-0 h-full w-full object-cover opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 py-28 text-center">
          <h2 className="text-4xl md:text-6xl">Your timber. Your workshop. Your way.</h2>
          <p className="mt-6 text-lg text-bark-foreground/80">TimberVault brings your timber inventory, offcuts, labels and cutting plans together in one place. Spend less time searching for wood. Spend more time making things.</p>
          <a href="#start" className={`${btnPrimary} mt-10`}>Get Started with TimberVault</a>
          <p className="mt-8 font-display text-xl italic">Make every piece count.</p>
        </div>
      </section>

      <footer className="bg-bark px-6 py-8 text-center text-sm text-bark-foreground/50">© {new Date().getFullYear()} TimberVault</footer>
    </main>
  );
}
