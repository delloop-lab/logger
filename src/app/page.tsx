import React from 'react';
import type { Metadata } from 'next';
import './landing/landing.css';

export const metadata: Metadata = {
  title: 'Logger — Timber inventory, QR labels & cut planning',
  description:
    'Organise your timber inventory, track every board and offcut, plan cuts and reduce waste.',
  openGraph: {
    title: 'Logger — Know what timber you have',
    description:
      'Track every board and offcut, plan cuts, reduce waste. Less searching. More making.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

const features = [
  {
    tag: 'A',
    title: "Know exactly what's in your workshop.",
    name: "Know what timber you've got",
    body: 'Keep track of useful timber with the details that matter, from full boards to leftover pieces.',
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
    body: 'Generate and print labels that connect physical timber to its digital record. Scan the label and find what you need.',
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
    name: 'Plan your cuts with less guesswork',
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
    name: 'Plan your cuts',
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
    name: 'Find a use for your offcuts',
    img: '/landing/offcuts.jpg',
    body: 'Stop seeing offcuts as waste. Work out what you can make with the timber you already have.',
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
    name: 'A little more order in your workshop',
    body: 'Keep timber connected to its place, rack, shelf, workbench or storage area, without turning organisation into a chore.',
    list: ['Racks', 'Shelves', 'Workbenches', 'Storage areas'],
    foot: 'Find what you need without searching the entire workshop.',
  },
];

const steps = [
  [
    '1',
    "Add what you've got",
    'Record a board, an offcut or a batch of timber. Start small. No big inventory exercise.',
  ],
  [
    '2',
    'Let Logger do the thinking',
    'Enter the pieces you need and generate a practical cutting plan.',
  ],
  [
    '3',
    'Get back to making',
    'Spend less time calculating and searching, and more time at the workbench.',
  ],
];

const audiences = [
  [
    'Cabinetmakers & furniture makers',
    'Keep track of material dimensions, plan components and make better use of available timber.',
  ],
  [
    'DIY enthusiasts & hobbyists',
    'Bring a little more order to growing timber collections, find a use for leftovers and work out what you can make next.',
  ],
  [
    'Small workshops & makers',
    'Keep useful timber accessible without complicated enterprise software.',
  ],
];

const compare = [
  ['Generic stock records', 'Timber-specific records'],
  ['Stock quantities', 'Individual boards and offcuts'],
  ['Manual identification', 'QR-coded timber labels'],
  ['Basic inventory', 'Cutting plans with less guesswork'],
  ['Generic categories', 'Wood species and dimensions'],
  ['Static records', 'Workshop-focused workflows'],
];

const faqs = [
  [
    'Do I need to be a professional woodworker?',
    'No. Logger is intended for anyone who works with timber, from professional makers to DIY enthusiasts.',
  ],
  [
    'Do I need to catalogue my whole workshop first?',
    'No. Add a few boards or offcuts when you need them. Start small and get useful results straight away.',
  ],
  [
    'Can I record individual offcuts?',
    'Yes. Logger helps you keep track of individual pieces as well as batches of timber.',
  ],
  [
    'Can I print labels?',
    'Yes. Logger supports QR-coded timber labels, including printing through compatible thermal printers such as the MXW-01.',
  ],
  [
    'Can I scan a timber label?',
    'Yes. Scan a label and retrieve the corresponding timber record.',
  ],
  [
    'Can Logger help me plan cuts?',
    'Yes. Enter the pieces you need and generate a practical cutting plan from the timber you already have.',
  ],
  [
    'Does it identify wood species from photographs?',
    'Camera-assisted recognition is intended to provide suggestions, not guaranteed identification. Users should review and confirm results.',
  ],
  [
    'Do I need complicated inventory software?',
    'No. Logger fits around your workshop habits. You do not have to change how you work to use it.',
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
            <a href="/" aria-label="Logger home">
              <img
                src="/brand/logger-logo.png"
                alt="Logger"
                className="block h-10 w-auto md:h-12"
                draggable={false}
              />
            </a>
            <a href="/app?login=1" className="btn btn-primary">
              Logger In
            </a>
          </nav>
          <div className="relative section-pad pb-24 pt-16 md:pt-28">
            <p className="eyebrow">Your timber. Your offcuts. Your projects.</p>
            <h1
              className="mt-6 max-w-3xl"
              style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', lineHeight: 1.05 }}
            >
              Manage your timber. Plan your projects. Cut with less waste.
            </h1>
            <p
              className="mt-6 max-w-xl text-lg body-copy"
              style={{ color: 'color-mix(in srgb, var(--tv-bark-foreground) 80%, transparent)' }}
            >
              Logger is a free woodworking tool that helps you catalogue timber and offcuts,
              discover what you can make, and generate optimised cutting plans. All in one place,
              without complicated spreadsheets or hours of planning.
            </p>
            <p
              className="mt-4 max-w-xl text-lg body-copy"
              style={{ color: 'color-mix(in srgb, var(--tv-bark-foreground) 80%, transparent)' }}
            >
              Add a few boards or offcuts whenever you need to. Logger helps you make better use of
              the timber you already have, without turning your time in the workshop into another
              admin job.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <a href="#problem" className="btn btn-primary">
                Explore Logger
              </a>
              <a href="/app" className="btn btn-ghost">
                Demo
              </a>
              <a href="/app?signup=1" className="btn btn-ghost">
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
              Less organising. Less waste. More time making.
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
              Logger changes that, without asking you to catalogue everything first.
            </p>
          </div>
        </section>

        {/* Solution */}
        <section style={{ background: 'var(--tv-secondary)' }}>
          <div className="section-pad max-w-4xl py-24 text-center">
            <p className="eyebrow">The solution</p>
            <h2 className="mt-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
              Built to fit around your workshop, not become another job in it.
            </h2>
            <p className="mt-6 text-lg body-copy" style={{ color: 'var(--tv-muted-foreground)' }}>
              Keep track of useful timber, from full-length boards to the smallest useful offcuts.
              Add what you need when you need it, find it again, plan your cuts and get back to making.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                'Add a few boards or offcuts when you need them.',
                'Find what you have and plan your cuts.',
                'Get on with making, without a big inventory exercise.',
              ].map((t) => (
                <div
                  key={t}
                  className="rounded-lg border p-6 text-lg body-copy"
                  style={{
                    background: 'var(--tv-card)',
                    fontFamily: 'var(--tv-font-sans)',
                    borderColor: 'var(--tv-border)',
                    lineHeight: 1.45,
                  }}
                >
                  {t}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How little effort */}
        <section id="how-it-works" className="section-pad py-24">
          <p className="eyebrow">How little effort it takes</p>
          <h2 className="mt-4 max-w-3xl" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
            Start small. Get something useful straight away.
          </h2>
          <p className="mt-6 max-w-2xl text-lg body-copy" style={{ color: 'var(--tv-muted-foreground)' }}>
            Try one board, one project or a handful of offcuts. No lengthy setup. No need to
            catalogue your entire workshop before you get started.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map(([n, title, body]) => (
              <div
                key={n}
                className="rounded-lg border p-6"
                style={{ background: 'var(--tv-card)', borderColor: 'var(--tv-border)' }}
              >
                <p className="eyebrow">{n}</p>
                <h3 className="mt-3 text-2xl" style={{ lineHeight: 1.3 }}>
                  {title}
                </h3>
                <p className="mt-3 body-copy" style={{ color: 'var(--tv-muted-foreground)' }}>
                  {body}
                </p>
              </div>
            ))}
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

        {/* Central promise */}
        <section style={{ background: 'var(--tv-bark)', color: 'var(--tv-bark-foreground)' }}>
          <div className="section-pad py-24 max-w-4xl">
            <p className="eyebrow">The real promise</p>
            <h2 className="mt-4" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', lineHeight: 1.15 }}>
              You didn&apos;t take up woodworking to manage timber records.
            </h2>
            <p
              className="mt-6 text-2xl body-copy"
              style={{
                fontFamily: 'var(--tv-font-sans)',
                color: 'color-mix(in srgb, var(--tv-bark-foreground) 90%, transparent)',
                lineHeight: 1.45,
              }}
            >
              You took it up to make things.
            </p>
            <p
              className="mt-8 text-lg body-copy max-w-2xl"
              style={{ color: 'color-mix(in srgb, var(--tv-bark-foreground) 80%, transparent)' }}
            >
              Logger takes care of the organising, planning and calculating, so you can spend more
              time doing what you enjoy. It works around your woodworking habits. You don&apos;t have
              to change your habits to use Logger.
            </p>
            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {[
                ['Before buying more,', 'check what you already have.'],
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
                <p className="mt-3 body-copy" style={{ color: 'var(--tv-muted-foreground)' }}>
                  {a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Help shape Logger */}
        <section id="feedback" className="section-pad py-24">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <p className="eyebrow">Help shape Logger</p>
              <h2 className="mt-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1.15 }}>
                Help make Logger better.
              </h2>
              <p className="mt-6 text-lg body-copy" style={{ color: 'var(--tv-muted-foreground)' }}>
                Logger is in beta, and looking for woodworkers and makers willing to try it and share
                their thoughts.
              </p>
              <p className="mt-4 text-lg body-copy" style={{ color: 'var(--tv-muted-foreground)' }}>
                Your feedback will help shape what comes next.
              </p>
              <p className="mt-6 text-lg body-copy" style={{ fontFamily: 'var(--tv-font-sans)' }}>
                Have a look, give it a go and tell me what you think.
              </p>
              <a href="/app?signup=1" className="btn btn-primary mt-8">
                Create a free account
              </a>
            </div>
            <div>
              <img
                src="/landing/workshop-feedback.jpg"
                alt="Woodworker at a workbench with timber and hand tools"
                loading="lazy"
                width={1600}
                height={1067}
                className="rounded-lg object-cover shadow-xl w-full"
              />
            </div>
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
            <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.75rem)', lineHeight: 1.15 }}>
              Spend less time organising timber. More time making things.
            </h2>
            <p
              className="mt-6 text-lg body-copy"
              style={{ color: 'color-mix(in srgb, var(--tv-bark-foreground) 80%, transparent)' }}
            >
              Logger takes care of the organising, planning and calculating, so you can spend more
              time doing what you enjoy. Start with one board, one project or a handful of offcuts.
            </p>
            <a href="/app?signup=1" className="btn btn-primary mt-10">
              Get Started with Logger
            </a>
          </div>
        </section>

        <footer
          className="px-6 py-8 text-center text-sm"
          style={{
            background: 'var(--tv-bark)',
            color: 'color-mix(in srgb, var(--tv-bark-foreground) 50%, transparent)',
          }}
        >
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <span>Logger (c) {year} The Novita Group Pty Ltd</span>
            <a
              href="mailto:loggerhelp@novitagroup.com"
              className="font-bold hover:opacity-100"
              style={{ color: 'var(--tv-primary)' }}
            >
              Contact
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
