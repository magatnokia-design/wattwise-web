import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const outletCards = [
  {
    id: 'outlet1',
    label: 'Outlet 1',
    location: 'Kitchen',
    status: 'Offline',
    appliance: 'Not assigned',
  },
  {
    id: 'outlet2',
    label: 'Outlet 2',
    location: 'Living Room',
    status: 'Offline',
    appliance: 'Not assigned',
  },
];

const featureHighlights = [
  {
    id: 'realtime',
    title: 'Real-time telemetry',
    description:
      'Stream power, voltage, and current the moment your outlets update. Pin alert thresholds without leaving the dashboard.',
    tags: ['Power', 'Voltage', 'Current'],
  },
  {
    id: 'automation',
    title: 'Smart schedules',
    description:
      'Set countdown timers or weekly schedules so devices power down automatically when usage spikes or time runs out.',
    tags: ['Countdowns', 'Weeklies', 'Auto-off'],
  },
  {
    id: 'exports',
    title: 'Export-ready history',
    description:
      'Pull CSV, Excel, or PDF reports whenever you need receipts, audits, or a quick budget snapshot.',
    tags: ['CSV', 'Excel', 'PDF'],
  },
  {
    id: 'safety',
    title: 'Power safety guardrails',
    description:
      'Define voltage and current limits so devices shut down safely when readings go out of range.',
    tags: ['Auto-shutdown', 'Alerts', 'Protection'],
  },
];

const roadmapSteps = [
  {
    title: 'Connect devices',
    description: 'Pair two WattWise outlets to start streaming live telemetry.',
  },
  {
    title: 'Monitor and label',
    description: 'Name appliances and tag usage to clarify which loads cost the most.',
  },
  {
    title: 'Optimize spend',
    description: 'Set budgets, schedules, and alerts to prevent energy surprises.',
  },
  {
    title: 'Export proof',
    description: 'Download compliant reports for billing, audits, or reimbursements.',
  },
];

const faqItems = [
  {
    question: 'How many outlets are supported?',
    answer:
      'The web dashboard supports two outlets (outlet1, outlet2) to match the WattWise hardware.',
  },
  {
    question: 'Is the dashboard mobile-friendly?',
    answer:
      'The web app is optimized for desktop and tablet. Mobile access is handled by the WattWise mobile app.',
  },
  {
    question: 'Can I control outlets remotely?',
    answer:
      'Yes. Outlet toggles run through secure Cloud Functions and mirror the WattWise mobile app behavior.',
  },
];

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export default function LandingPage() {
  const [activeOutletId, setActiveOutletId] = useState(outletCards[0].id);
  const [usageTarget, setUsageTarget] = useState(320);
  const [ratePerKwh, setRatePerKwh] = useState(0.15);
  const [mode, setMode] = useState<'eco' | 'comfort'>('eco');
  const [autoShutdown, setAutoShutdown] = useState(true);
  const [activeFeatureId, setActiveFeatureId] = useState(featureHighlights[0].id);
  const [featureAutoRotate, setFeatureAutoRotate] = useState(true);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [splashLeaving, setSplashLeaving] = useState(false);
  const [showPairingSteps, setShowPairingSteps] = useState(false);
  const featurePauseTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const leaveTimer = setTimeout(() => setSplashLeaving(true), 900);
    const hideTimer = setTimeout(() => setShowSplash(false), 1500);

    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  useEffect(() => {
    if (!featureAutoRotate) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveFeatureId((current) => {
        const currentIndex = featureHighlights.findIndex((feature) => feature.id === current);
        const nextIndex = (currentIndex + 1) % featureHighlights.length;
        return featureHighlights[nextIndex].id;
      });
    }, 7000);

    return () => window.clearInterval(interval);
  }, [featureAutoRotate]);

  useEffect(() => {
    return () => {
      if (featurePauseTimeoutRef.current !== null) {
        window.clearTimeout(featurePauseTimeoutRef.current);
      }
    };
  }, []);

  const activeOutlet = outletCards.find((outlet) => outlet.id === activeOutletId) ?? outletCards[0];
  const activeFeature =
    featureHighlights.find((feature) => feature.id === activeFeatureId) ?? featureHighlights[0];
  const loadPercent = Math.min(100, Math.round((usageTarget / 900) * 100));
  const savingsRate = mode === 'eco' ? 0.18 : 0.12;
  const monthlyCost = usageTarget * ratePerKwh;
  const monthlySavings = monthlyCost * savingsRate;
  const annualSavings = monthlySavings * 12;
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

  const handleRateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number(event.target.value);
    setRatePerKwh(Number.isFinite(nextValue) ? nextValue : 0);
  };

  const handleNotifySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      return;
    }
    setIsSubmitted(true);
  };

  const pauseFeatureRotation = () => {
    if (featurePauseTimeoutRef.current !== null) {
      window.clearTimeout(featurePauseTimeoutRef.current);
    }
    setFeatureAutoRotate(false);
    featurePauseTimeoutRef.current = window.setTimeout(() => {
      setFeatureAutoRotate(true);
    }, 12000);
  };

  const handleFeatureSelect = (featureId: string) => {
    pauseFeatureRotation();
    setActiveFeatureId(featureId);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6faf8] font-['Manrope'] text-[color:var(--color-text)]">
      {showSplash && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--color-primary)] text-white transition-all duration-700 ${
            splashLeaving ? 'opacity-0 scale-105' : 'opacity-100'
          }`}
          aria-live="polite"
        >
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-2xl font-semibold">
              W
            </div>
            <p className="mt-4 text-xs uppercase tracking-[0.4em] text-white/80">WattWise</p>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-white/80">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
              <span>Syncing device state</span>
            </div>
          </div>
        </div>
      )}

      <div
        className="pointer-events-none absolute -top-24 right-10 h-72 w-72 rounded-full bg-emerald-200/50 blur-3xl float-slow"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-10 left-10 h-80 w-80 rounded-full bg-emerald-100/60 blur-3xl float-fast"
        aria-hidden="true"
      />

      <header className="sticky top-0 z-30 border-b border-white/60 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--color-primary)] text-white">
              W
            </div>
            <div>
              <p className="text-lg font-semibold font-['Space_Grotesk']">WattWise</p>
              <p className="text-xs text-[color:var(--color-text-light)]">Energy command desk</p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-[color:var(--color-text-light)] md:flex">
            <a href="#features" className="hover:text-[color:var(--color-primary)]">
              Features
            </a>
            <a href="#preview" className="hover:text-[color:var(--color-primary)]">
              Savings
            </a>
            <a href="#safety" className="hover:text-[color:var(--color-primary)]">
              Safety
            </a>
            <a href="#faq" className="hover:text-[color:var(--color-primary)]">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="rounded-full border border-[color:var(--color-border)] px-4 py-2 text-sm text-[color:var(--color-text)] transition hover:border-[color:var(--color-primary)]"
            >
              Log in
            </a>
            <a
              href="/register"
              className="rounded-full bg-[color:var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-dark)]"
            >
              Get started
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-12 px-6 pb-16 pt-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--color-primary-dark)]">
              Desktop energy companion
            </p>
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl font-['Space_Grotesk']">
              See every watt in your space and act before the bill hits.
            </h1>
            <p className="max-w-xl text-lg text-[color:var(--color-text-light)]">
              WattWise Web gives you a live control center for two smart outlets. Track power draw,
              schedule appliances, and export reports without touching your phone.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="/register"
                className="rounded-full bg-[color:var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-dark)]"
              >
                Launch the dashboard
              </a>
              <a
                href="#preview"
                className="rounded-full border border-[color:var(--color-border)] px-6 py-3 text-sm font-semibold text-[color:var(--color-text)] transition hover:border-[color:var(--color-primary)]"
              >
                Estimate savings
              </a>
            </div>
            {isAndroid && (
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[color:var(--color-border)] bg-white/80 px-4 py-3 text-sm">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Android only
                </span>
                <Button type="button" variant="secondary" size="sm" disabled className="w-full sm:w-auto">
                  Download Android app (coming soon)
                </Button>
              </div>
            )}
            <div className="mt-6 flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-text-light)]">
                  Hardware
                </p>
                <p className="font-semibold">2 smart outlets</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-text-light)]">
                  Backend
                </p>
                <p className="font-semibold">Firebase + Cloud Functions</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-text-light)]">
                  Platform
                </p>
                <p className="font-semibold">Desktop + tablet</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-text-light)]">
                  Outlet preview
                </p>
                <h2 className="text-lg font-semibold">Control cockpit</h2>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                Preview
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {outletCards.map((outlet) => (
                <button
                  key={outlet.id}
                  type="button"
                  onClick={() => setActiveOutletId(outlet.id)}
                  aria-pressed={activeOutletId === outlet.id}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    activeOutletId === outlet.id
                      ? 'bg-[color:var(--color-primary)] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-emerald-50'
                  }`}
                >
                  {outlet.label}
                </button>
              ))}
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-[140px_1fr]">
              <div className="flex items-center justify-center">
                <div
                  className="relative flex h-32 w-32 items-center justify-center rounded-full p-3"
                  style={{
                    background: `conic-gradient(var(--color-primary) ${loadPercent}%, rgba(226, 232, 240, 0.7) ${loadPercent}% 100%)`,
                  }}
                >
                  <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white text-center">
                    <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-text-light)]">
                      Load
                    </span>
                    <span className="text-2xl font-semibold">{loadPercent}%</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-gray-50 px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-text-light)]">
                    Status
                  </p>
                  <p className="font-semibold">{activeOutlet.status}</p>
                </div>
                <div className="rounded-xl bg-gray-50 px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-text-light)]">
                    Location
                  </p>
                  <p className="font-semibold">{activeOutlet.location}</p>
                </div>
                <div className="rounded-xl bg-gray-50 px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-text-light)]">
                    Appliance
                  </p>
                  <p className="font-semibold">{activeOutlet.appliance}</p>
                </div>
                <div className="rounded-xl bg-gray-900 px-3 py-2 text-white">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-300">Live power</p>
                  <p className="font-semibold">0 W</p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowPairingSteps((current) => !current)}
                aria-expanded={showPairingSteps}
                className="text-xs font-semibold text-emerald-700 transition hover:text-emerald-800"
              >
                {showPairingSteps ? 'Hide pairing steps' : 'View pairing steps'}
              </button>
              <span className="text-xs text-[color:var(--color-text-light)]">Status: Offline</span>
            </div>
            {showPairingSteps && (
              <div className="mt-4 rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-3 text-xs text-[color:var(--color-text-light)]">
                <ol className="space-y-2">
                  <li>1. Power the outlet and confirm the LED is blinking.</li>
                  <li>2. Open the WattWise mobile app to pair the device.</li>
                  <li>3. Name each outlet to unlock live telemetry here.</li>
                </ol>
              </div>
            )}
            <p className="mt-4 text-xs text-[color:var(--color-text-light)]">
              Connect your WattWise outlets to replace previews with live readings.
            </p>
          </div>
        </section>

        <section id="features" className="bg-white/70 py-16 backdrop-blur">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--color-text-light)]">
                  Feature runway
                </p>
                <h2 className="mt-3 text-3xl font-semibold font-['Space_Grotesk']">
                  Build a smarter energy rhythm
                </h2>
                <p className="mt-4 text-[color:var(--color-text-light)]">
                  Hover or tap a feature to preview how WattWise orchestrates monitoring, automation,
                  and reporting for your space.
                </p>
                <div className="mt-6 space-y-3">
                  {featureHighlights.map((feature) => (
                    <button
                      key={feature.id}
                      type="button"
                      onClick={() => handleFeatureSelect(feature.id)}
                      onFocus={() => handleFeatureSelect(feature.id)}
                      onMouseEnter={() => handleFeatureSelect(feature.id)}
                      className={`flex w-full items-start justify-between rounded-2xl border px-4 py-3 text-left transition ${
                        activeFeatureId === feature.id
                          ? 'border-[color:var(--color-primary)] bg-emerald-50/60'
                          : 'border-transparent bg-white hover:border-[color:var(--color-border)]'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold">{feature.title}</p>
                        <p className="text-xs text-[color:var(--color-text-light)]">
                          {feature.description}
                        </p>
                      </div>
                      <span className="text-xs text-[color:var(--color-primary-dark)]">View</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-lg">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-text-light)]">
                  Highlight
                </p>
                <h3 className="mt-3 text-2xl font-semibold font-['Space_Grotesk']">
                  {activeFeature.title}
                </h3>
                <p className="mt-3 text-[color:var(--color-text-light)]">
                  {activeFeature.description}
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {activeFeature.tags.map((tag) => (
                    <div
                      key={tag}
                      className="rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-3 text-center text-sm font-semibold"
                    >
                      {tag}
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-2xl bg-gray-900 px-5 py-4 text-white">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-300">Status</p>
                  <p className="mt-2 text-lg font-semibold">All systems ready for live data.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="preview" className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--color-text-light)]">
                  Savings lab
                </p>
                <h2 className="text-2xl font-semibold font-['Space_Grotesk']">Plan your monthly bill</h2>
              </div>
              <div className="flex gap-2">
                {(['eco', 'comfort'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setMode(option)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                      mode === option
                        ? 'bg-[color:var(--color-primary)] text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-emerald-50'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-text-light)]">
                  Monthly usage target
                </label>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-semibold">{usageTarget}</span>
                  <span className="text-xs text-[color:var(--color-text-light)]">kWh</span>
                </div>
                <input
                  type="range"
                  min={150}
                  max={900}
                  step={10}
                  value={usageTarget}
                  onChange={(event) => setUsageTarget(Number(event.target.value))}
                  className="mt-3 w-full accent-emerald-500"
                  aria-label="Monthly energy usage"
                />
              </div>
              <Input
                label="Energy rate (per kWh)"
                type="number"
                min={0}
                step={0.01}
                value={ratePerKwh}
                onChange={handleRateChange}
              />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-gray-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-text-light)]">
                  Bill
                </p>
                <p className="text-lg font-semibold">{currencyFormatter.format(monthlyCost)}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-700">
                <p className="text-xs uppercase tracking-[0.2em]">Monthly savings</p>
                <p className="text-lg font-semibold">{currencyFormatter.format(monthlySavings)}</p>
              </div>
              <div className="rounded-2xl bg-gray-900 px-4 py-3 text-white">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-300">Annual</p>
                <p className="text-lg font-semibold">{currencyFormatter.format(annualSavings)}</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-[color:var(--color-text-light)]">
              Projections update based on your inputs. Replace with live data after device setup.
            </p>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-lg">
              <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--color-text-light)]">
                Automation
              </p>
              <h3 className="mt-2 text-2xl font-semibold font-['Space_Grotesk']">
                Set it and forget it
              </h3>
              <p className="mt-3 text-[color:var(--color-text-light)]">
                WattWise can power down outlets automatically when limits are reached. Toggle the
                guardrail to preview the behavior.
              </p>
              <button
                type="button"
                onClick={() => setAutoShutdown((current) => !current)}
                className="mt-6 flex w-full items-center justify-between rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold">Auto-shutdown</p>
                  <p className="text-xs text-[color:var(--color-text-light)]">
                    Safety limits are {autoShutdown ? 'armed' : 'paused'}
                  </p>
                </div>
                <span
                  className={`relative h-7 w-12 rounded-full transition ${
                    autoShutdown ? 'bg-emerald-500' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                      autoShutdown ? 'right-1' : 'left-1'
                    }`}
                  />
                </span>
              </button>
            </div>
            <div id="safety" className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-lg">
              <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--color-text-light)]">
                Safety flow
              </p>
              <h3 className="mt-2 text-2xl font-semibold font-['Space_Grotesk']">
                Keep appliances within safe ranges
              </h3>
              <div className="mt-4 space-y-4">
                {roadmapSteps.map((step, index) => (
                  <div key={step.title} className="flex items-start gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{step.title}</p>
                      <p className="text-xs text-[color:var(--color-text-light)]">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="bg-white/80 py-16 backdrop-blur">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center text-3xl font-semibold font-['Space_Grotesk']">
              Questions, answered
            </h2>
            <div className="mt-8 space-y-3">
              {faqItems.map((item, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div key={item.question} className="rounded-2xl border border-[color:var(--color-border)] bg-white">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenFaqIndex((current) => (current === index ? null : index))
                      }
                      aria-expanded={isOpen}
                      aria-controls={`faq-panel-${index}`}
                      className="flex w-full items-center justify-between px-5 py-4 text-left"
                    >
                      <span className="font-semibold">{item.question}</span>
                      <span
                        className={`text-xl font-semibold transition ${
                          isOpen ? 'text-emerald-600' : 'text-gray-400'
                        }`}
                      >
                        {isOpen ? '-' : '+'}
                      </span>
                    </button>
                    <div
                      id={`faq-panel-${index}`}
                      className={`px-5 pb-4 text-sm text-[color:var(--color-text-light)] ${
                        isOpen ? 'block' : 'hidden'
                      }`}
                    >
                      {item.answer}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16">
          <div className="rounded-3xl border border-white/70 bg-gray-900 p-8 text-white shadow-xl">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-gray-300">Launch alert</p>
                <h2 className="mt-3 text-3xl font-semibold font-['Space_Grotesk']">
                  Be the first to run the WattWise desktop dashboard
                </h2>
                <p className="mt-3 text-sm text-gray-300">
                  Leave your email to get notified when the production dashboard opens.
                </p>
              </div>
              <form className="space-y-3" onSubmit={handleNotifySubmit}>
                <Input
                  label="Work email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <Button type="submit" variant="primary" isLoading={false}>
                  {isSubmitted ? 'Added to the list' : 'Notify me'}
                </Button>
                {isSubmitted && (
                  <p className="text-xs text-emerald-200">You are on the list. Watch your inbox.</p>
                )}
              </form>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
