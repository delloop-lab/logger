import React from 'react';

const features = [
  {
    tag: 'A',
    title: "Know exactly what's in your workshop.",
    name: 'Timber inventory management',
    body: 'Record and organise your timber inventory with the details that matter.',
    list: [
      'Wood species',
      'Length, width and thickness',
      'Timber source',
      'Storage location',
      'Stock identification',
      'Individual boards and offcuts',
      'Batch management for multiple pieces',
    ],
    foot: 'No more guessing. No more rummaging through piles of timber.',
  },
  {
    tag: 'B',
    title: 'Give every board a digital identity.',
    name: 'QR identification',
    img: '/landing/qr-label.jpg',
    body: 'Generate and print labels that connect physical timber to its digital inventory record. Scan the label and find the record.',
    list: [
      'Unique stock ID',
      'Timber species',
      'Dimensions',
      'Source',
      'Storage location',
      'QR code for quick retrieval',
    ],
    foot: 'Your timber is physically labelled and digitally organised.',
  },
  {
    tag: 'C',
    title: 'Make better use of every board.',
    name: 'Intelligent cut-list & nesting',
    body: 'Plan how components can be cut from available stock, making smarter use of the material already in your workshop.',
    list: [
      'Required component dimensions',
      'Available board sizes',
      'Timber thickness',
      'Cutting sequences',
      'Material utilisation',
      'Remaining usable offcuts',
    ],
    foot: 'Use timber intelligently while retaining useful material for the next project.',
  },
  {
    tag: 'D',
    title: 'Know exactly where every cut goes.',
    name: 'PLAN YOUR CUTS',
    img: '/landing/cut-plan.png',
    body: 'Turn your project dimensions and available timber into clear, practical cutting plans. See how each piece fits, understand where to cut and make better use of the timber you already have.',
    list: [
      'Clear cutting diagrams',
      'Dimensions for every piece',
      'Optimised cutting layouts',
      'Less material waste',
    ],
    foot: 'Less guesswork at the saw. More timber for your next project.',
  },
  {
    tag: 'E',
    title: 'Turn forgotten offcuts into your next project.',
    name: 'What Can I Build?',
    img: '/landing/offcuts.jpg',
    body: 'Stop seeing offcuts as waste. Explore possible projects using the timber you already have.',
    list: [
      'A small shelving unit',
      'A workshop organiser',
      'A wooden storage box',
      'A stool or side table',
      'Components for a larger project',
    ],
    foot: 'Your next project might already be sitting in your workshop.',
  },
  {
    tag: 'F',
    title: 'Let your camera help identify your timber.',
    name: 'Camera-assisted recognition',
    body: 'Photograph a board or a collection and get image-assisted suggestions. You review, correct and decide what gets saved.',
    list: [
      'Likely wood species',
      'Visible knots and defects',
      'Timber characteristics',
      'Potential classifications',
      'Suggested dimensions where reliably detectable',
    ],
    foot: 'Logger never pretends an uncertain identification is a fact.',
  },
  {
    tag: 'G',
    title: 'Know where everything lives.',
    name: 'Workshop storage',
    body: 'Organise inventory by storage location, rack, shelf, workbench or storage area, and keep it connected to its physical place.',
    list: ['Racks', 'Shelves', 'Workbenches', 'Storage areas'],
    foot: 'Find what you need without searching the entire workshop.',
  },
];

const audiences = [
  [
    'Cabinetmakers & furniture makers',
    'Keep track of material dimensions, plan components and make better use of available timber.',
  ],
  [
    'DIY enthusiasts & hobbyists',
    'Bring order to growing timber collections, organise leftovers and discover new uses for existing material.',
  ],
  [
    'Small workshops & makers',
    'Keep inventory accessible and material organised without complicated enterprise software.',
  ],
];

const compare = [
  ['Generic stock records', 'Timber-specific records'],
  ['Stock quantities', 'Individual boards and offcuts'],
  ['Manual identification', 'QR-coded timber labels'],
  ['Basic inventory', 'Cutting and nesting tools'],
  ['Generic categories', 'Wood species and dimensions'],
  ['Static records', 'Workshop-focused workflows'],
];

const faqs = [
  [
    'Do I need to be a professional woodworker?',
    'No. Logger is intended for anyone who works with timber, from professional makers to DIY enthusiasts.',
  ],
  [
    'Can I record individual offcuts?',
    'Yes. Logger is designed to manage individual pieces as well as batches of timber.',
  ],
  [
    'Can I print labels?',
    'Yes. Logger supports QR-coded timber labels, including printing through compatible thermal printers such as the MXW-01.',
  ],
  [
    'Can I scan a timber label?',
    'Yes. The QR identification workflow allows you to scan a label and retrieve the corresponding inventory record.',
  ],
  [
    'Can Logger help me plan cuts?',
    'Yes. Its cutting and nesting functionality helps plan component layouts and make more intelligent use of available stock.',
  ],
  [
    'Does it identify wood species from photographs?',
    'Camera-assisted recognition is intended to provide suggestions, not guaranteed identification. Users should review and confirm results.',
  ],
  [
    'Do I need complicated inventory software?',
    'No. Logger provides practical workshop tools without the overhead of a large business management system.',
  ],
];

export default function LandingPage() {
  const year = new Date().getFullYear();

  return (
    <div className="tv-landing">
      <main>
        {/* Hero */}
        <section
          className="relative overflow-hidden"
          style={{ minHeight: '92vh', background: 'var(--tv-bark)', color: 'var(--tv-bark-foreground)' }}
        >
          <img
            src="/landing/hero-workshop.jpg"
            alt="Timber racks with QR-labelled boards"
            width={1600}
            height={1008}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity: 0.45 }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to right, var(--tv-bark), color-mix(in srgb, var(--tv-bark) 80%, transparent), transparent)',
            }}
          />
          <nav className="relative section-pad flex items-center justify-between py-6">
            <a href="/landing" aria-label="Logger home">
              <img
                src="/brand/logger-logo.png"
                alt="Logger"
                className="block h-10 w-auto md:h-12"
                draggable={false}
              />
            </a>
            <a href="/" className="btn btn-primary">
              Get Started
            </a>
          </nav>
          <div className="relative section-pad pb-24 pt-16 md:pt-28">
            <p className="eyebrow">Your timber. Your offcuts. Your projects.</p>
            <h1
              className="mt-6 max-w-3xl"
              style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', lineHeight: 1.05 }}
            >
              Know what timber you have. Know what you can make.
            </h1>
            <p
              className="mt-6 max-w-xl text-lg body-copy"
              style={{ color: 'color-mix(in srgb, var(--tv-bark-foreground) 80%, transparent)' }}
            >
              Logger is totally free. It helps woodworkers organise their timber inventory, track
              every board and offcut, plan cuts, reduce waste and make better use of the wood they
              already own.
            </p>
            <div
              className="mt-6 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-widest"
              style={{ color: 'color-mix(in srgb, var(--tv-bark-foreground) 70%, transparent)' }}
            >
              {['Timber inventory', 'QR identification', 'Cut planning'].map((t) => (
                <span
                  key={t}
                  className="rounded-full px-3 py-1"
                  style={{
                    border: '1px solid color-mix(in srgb, var(--tv-bark-foreground) 30%, transparent)',
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
              <a href="/" className="btn btn-primary">
                Get Started
              </a>
              <a href="#problem" className="btn btn-ghost">
                Explore Logger
              </a>
              <a href="/" className="btn btn-ghost">
                Demo
              </a>
              <a href="/?signup=1" className="btn btn-ghost">
                Create Account
              </a>
            </div>
            <p
              className="mt-10 text-xl body-copy"
              style={{
                fontFamily: 'var(--tv-font-sans)',
                color: 'color-mix(in srgb, var(--tv-bark-foreground) 80%, transparent)',
              }}
            >
              Less searching. Less waste. More making.
            </p>
          </div>
        </section>

        {/* Problem */}
        <section id="problem" className="section-pad grid gap-12 py-24 md:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="eyebrow">The problem</p>
            <h2 className="mt-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
              How much timber do you actually have?
            </h2>
          </div>
          <div className="space-y-5 text-lg body-copy" style={{ color: 'var(--tv-muted-foreground)' }}>
            <p>If you&apos;re anything like most woodworkers, you probably have more timber than you think.</p>
            <p>
              Boards stacked against walls. Offcuts tucked under benches. Useful pieces hiding behind
              other useful pieces. Timber you bought months ago and completely forgot about.
            </p>
            <p>
              You know there&apos;s a piece somewhere that would be perfect for your next project. You
              just can&apos;t remember where you put it, and when you find it, it might be too short,
              too narrow or unsuitable.
            </p>
            <p className="text-2xl" style={{ fontFamily: 'var(--tv-font-sans)', color: 'var(--tv-foreground)', lineHeight: 1.45 }}>
              The problem isn&apos;t that you need more timber. It&apos;s that you don&apos;t have a
              clear picture of what you&apos;ve already got.
            </p>
            <p className="font-bold" style={{ color: 'var(--tv-primary)' }}>
              Logger changes that.
            </p>
          </div>
        </section>

        {/* Solution */}
        <section style={{ background: 'var(--tv-secondary)' }}>
          <div className="section-pad max-w-4xl py-24 text-center">
            <p className="eyebrow">The solution</p>
            <h2 className="mt-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
              Your workshop deserves a better memory.
            </h2>
            <p className="mt-6 text-lg body-copy" style={{ color: 'var(--tv-muted-foreground)' }}>
              A central place to manage your timber inventory, from full-length boards to the
              smallest useful offcuts. Record what you have, where it&apos;s stored, what it&apos;s
              made from and what dimensions are available.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                'Give every piece its own identity.',
                'Find it when you need it.',
                'Check what you own before buying more.',
              ].map((t) => (
                <div
                  key={t}
                  className="rounded-lg border p-6 text-lg"
                  style={{
                    background: 'var(--tv-card)',
                    fontFamily: 'var(--tv-font-display)',
                    borderColor: 'var(--tv-border)',
                  }}
                >
                  {t}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="section-pad py-24">
          <p className="eyebrow">Features</p>
          <h2 className="mt-4 max-w-2xl" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
            What Logger actually does.
          </h2>
          <div className="mt-16 space-y-20">
            {features.map((f, i) => (
              <article
                key={f.tag}
                className={`grid items-center gap-10 md:grid-cols-2 ${i % 2 ? 'md:[&>*:first-child]:order-2' : ''}`}
              >
                <div>
                  <p className="eyebrow">
                    {f.tag} · {f.name}
                  </p>
                  <h3 className="mt-3" style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)' }}>
                    {f.title}
                  </h3>
                  <p className="mt-4 body-copy" style={{ color: 'var(--tv-muted-foreground)' }}>
                    {f.body}
                  </p>
                  <p className="mt-6 text-lg body-copy" style={{ fontFamily: 'var(--tv-font-sans)' }}>
                    {f.foot}
                  </p>
                </div>
                {'img' in f && f.img ? (
                  <div>
                    <img
                      src={f.img}
                      alt={f.name}
                      loading="lazy"
                      width={1200}
                      height={912}
                      className="rounded-lg object-cover shadow-xl"
                    />
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {f.list.map((l) => (
                        <li
                          key={l}
                          className="rounded-full px-3 py-1 text-sm"
                          style={{ background: 'var(--tv-muted)' }}
                        >
                          {l}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <ul
                    className="divide-y rounded-lg border"
                    style={{ background: 'var(--tv-card)', borderColor: 'var(--tv-border)' }}
                  >
                    {f.list.map((l, j) => (
                      <li key={l} className="flex items-center gap-4 px-6 py-4">
                        <span style={{ fontFamily: 'var(--tv-font-display)', color: 'var(--tv-primary)' }}>
                          {String(j + 1).padStart(2, '0')}
                        </span>
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
        <section style={{ background: 'var(--tv-bark)', color: 'var(--tv-bark-foreground)' }}>
          <div className="section-pad py-24">
            <p className="eyebrow">The bigger idea</p>
            <h2 className="mt-4 max-w-3xl" style={{ fontSize: 'clamp(2rem, 5vw, 3.75rem)' }}>
              Stop buying timber you might already have.
            </h2>
            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {[
                ['Before buying more,', 'check your inventory.'],
                ['Before throwing something away,', 'see whether it has another use.'],
                ['Before cutting,', 'plan how to get the most from your stock.'],
              ].map(([a, b]) => (
                <div
                  key={a}
                  className="pt-6"
                  style={{
                    borderTop: '1px solid color-mix(in srgb, var(--tv-bark-foreground) 25%, transparent)',
                  }}
                >
                  <p style={{ color: 'color-mix(in srgb, var(--tv-bark-foreground) 60%, transparent)' }}>
                    {a}
                  </p>
                  <p className="mt-1 text-2xl" style={{ fontFamily: 'var(--tv-font-display)' }}>
                    {b}
                  </p>
                </div>
              ))}
            </div>
            <p
              className="mt-14 text-lg"
              style={{ color: 'color-mix(in srgb, var(--tv-bark-foreground) 80%, transparent)' }}
            >
              Better organisation. Better decisions. Less unnecessary waste.
            </p>
          </div>
        </section>

        {/* Audience */}
        <section className="section-pad py-24">
          <p className="eyebrow">Who it&apos;s for</p>
          <h2 className="mt-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
            Who is Logger for?
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {audiences.map(([t, d]) => (
              <div
                key={t}
                className="rounded-lg border p-6"
                style={{ background: 'var(--tv-card)', borderColor: 'var(--tv-border)' }}
              >
                <h3 className="text-xl" style={{ lineHeight: 1.35 }}>
                  {t}
                </h3>
                <p
                  className="mt-3 text-sm body-copy"
                  style={{ color: 'var(--tv-muted-foreground)' }}
                >
                  {d}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Why */}
        <section style={{ background: 'var(--tv-secondary)' }}>
          <div className="section-pad grid gap-12 py-24 md:grid-cols-2">
            <div>
              <p className="eyebrow">Why Logger?</p>
              <h2 className="mt-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
                Built around the way woodworkers actually work.
              </h2>
              <p className="mt-6 body-copy" style={{ color: 'var(--tv-muted-foreground)' }}>
                Most inventory software is designed around products, quantities and sales. Logger
                is designed around timber. A board isn&apos;t just another stock item, its species,
                thickness, dimensions, condition, location and remaining usable material all matter.
              </p>
            </div>
            <div
              className="overflow-hidden rounded-lg border"
              style={{ background: 'var(--tv-card)', borderColor: 'var(--tv-border)' }}
            >
              <div
                className="grid grid-cols-2 text-sm font-bold"
                style={{ background: 'var(--tv-bark)', color: 'var(--tv-bark-foreground)' }}
              >
                <div className="px-5 py-3">Typical inventory software</div>
                <div className="px-5 py-3" style={{ color: 'var(--tv-primary)' }}>
                  Logger
                </div>
              </div>
              {compare.map(([a, b]) => (
                <div key={a} className="grid grid-cols-2 border-t text-sm">
                  <div
                    className="px-5 py-4 line-through"
                    style={{ color: 'var(--tv-muted-foreground)', textDecorationColor: 'var(--tv-border)' }}
                  >
                    {a}
                  </div>
                  <div className="px-5 py-4 font-bold">{b}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-6 py-24">
          <p className="eyebrow">FAQ</p>
          <h2 className="mt-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
            Frequently asked questions
          </h2>
          <div className="mt-10 divide-y border-y" style={{ borderColor: 'var(--tv-border)' }}>
            {faqs.map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary
                  className="flex cursor-pointer list-none items-center justify-between text-xl"
                  style={{ fontFamily: 'var(--tv-font-display)' }}
                >
                  {q}
                  <span className="transition-transform group-open:rotate-45" style={{ color: 'var(--tv-primary)' }}>
                    +
                  </span>
                </summary>
                <p className="mt-3" style={{ color: 'var(--tv-muted-foreground)' }}>
                  {a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section
          id="start"
          className="relative overflow-hidden"
          style={{ background: 'var(--tv-bark)', color: 'var(--tv-bark-foreground)' }}
        >
          <img
            src="/landing/hero-workshop.jpg"
            alt=""
            loading="lazy"
            width={1600}
            height={1008}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ opacity: 0.2 }}
          />
          <div className="relative mx-auto max-w-3xl px-6 py-28 text-center">
            <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.75rem)' }}>
              Your timber. Your workshop. Your way.
            </h2>
            <p
              className="mt-6 text-lg body-copy"
              style={{ color: 'color-mix(in srgb, var(--tv-bark-foreground) 80%, transparent)' }}
            >
              Logger brings your timber inventory, offcuts, labels and cutting plans together in
              one place. Spend less time searching for wood. Spend more time making things.
            </p>
            <a href="/" className="btn btn-primary mt-10">
              Get Started with Logger
            </a>
            <p
              className="mt-8 text-xl body-copy"
              style={{ fontFamily: 'var(--tv-font-sans)' }}
            >
              Make every piece count.
            </p>
          </div>
        </section>

        <footer
          className="px-6 py-8 text-center text-sm"
          style={{
            background: 'var(--tv-bark)',
            color: 'color-mix(in srgb, var(--tv-bark-foreground) 50%, transparent)',
          }}
        >
          Logger (c) {year} Lou Schillaci
        </footer>
      </main>
    </div>
  );
}
