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

const trustTags = [
  'Campus facilities',
  'Co-working ops',
  'Apartment managers',
  'Retail pilots',
  'Energy auditors',
];

const trustStack = ['Firebase Auth', 'Cloud Functions', 'Firestore', 'Vercel'];

const testimonials = [
  {
    quote: 'Peak alerts helped us stagger loads before demand spikes hit.',
    name: 'R. Santos',
    role: 'Facilities lead',
  },
  {
    quote: 'The outlet labels and history view made audits painless.',
    name: 'J. Navarro',
    role: 'Ops manager',
  },
  {
    quote: 'Schedules keep our shared spaces quiet overnight without manual checks.',
    name: 'K. Lim',
    role: 'Property supervisor',
  },
];

const howItWorksSteps = [
  {
    title: 'Pair outlets',
    description: 'Connect two WattWise outlets with the mobile app in minutes.',
  },
  {
    title: 'Label devices',
    description: 'Name appliances and rooms to keep telemetry organized.',
  },
  {
    title: 'Automate rules',
    description: 'Set schedules, budgets, and safety guardrails.',
  },
  {
    title: 'Export proof',
    description: 'Download history and cost reports for audits.',
  },
];

const phoneFeatureHighlights = [
  {
    title: 'Live household snapshot',
    description: 'See total energy usage the moment outlet data refreshes.',
  },
  {
    title: 'Estimated cost pulse',
    description: 'A rolling cost estimate keeps spend visible at a glance.',
  },
  {
    title: 'Active outlet count',
    description: 'Know how many outlets are live without opening a menu.',
  },
  {
    title: 'Outlet status labels',
    description: 'Check which outlet is on with clear status pills.',
  },
  {
    title: 'Per-outlet telemetry',
    description: 'Power, voltage, current, and energy live in one card.',
  },
  {
    title: 'One-tap shutoff',
    description: 'Turn outlets off quickly when usage spikes.',
  },
];

const phoneScreens = [
  {
    id: 'snapshot',
    label: 'Live snapshot',
    description: 'Household usage and outlet controls at a glance.',
  },
  {
    id: 'outlets',
    label: 'Smart Outlets',
    description: 'Per-outlet cards with suggested appliance labels.',
  },
  {
    id: 'usage',
    label: 'Energy usage',
    description: 'Monthly usage totals and weekly consumption bars.',
  },
  {
    id: 'history',
    label: 'History',
    description: 'Activity logs and daily usage summaries.',
  },
  {
    id: 'schedule',
    label: 'Schedule',
    description: 'Automate outlet timers with repeat schedules.',
  },
  {
    id: 'notifications',
    label: 'Alerts',
    description: 'Unread notifications and system alerts.',
  },
  {
    id: 'safety',
    label: 'Power safety',
    description: 'Thresholds, auto cut-off, and alert monitoring.',
  },
];

const phoneSnapshotSummary = [
  {
    label: 'Estimated Cost',
    value: 'PHP 23.76',
  },
  {
    label: 'Active Outlets',
    value: '2',
  },
];

const phoneOutletPreviews = [
  {
    id: 'phone-outlet-1',
    label: 'Outlet 1',
    status: 'ON',
    metrics: [
      { label: 'Power', value: '120 W' },
      { label: 'Voltage', value: '219 V' },
      { label: 'Current', value: '0.55 A' },
      { label: 'Energy', value: '0.48 kWh' },
    ],
  },
  {
    id: 'phone-outlet-2',
    label: 'Outlet 2',
    status: 'ON',
    metrics: [
      { label: 'Power', value: '250 W' },
      { label: 'Voltage', value: '221 V' },
      { label: 'Current', value: '1.14 A' },
      { label: 'Energy', value: '1.50 kWh' },
    ],
  },
];

const phoneSafetySteps = ['Normal', 'Warning', 'Limit', 'Cut-off'];

const phoneUsageTabs = ['Daily', 'Weekly', 'Monthly'];

const phoneUsageBars = [
  { label: 'Week 1', value: 75 },
  { label: 'Week 2', value: 105 },
  { label: 'Week 3', value: 90 },
  { label: 'Week 4', value: 80 },
];

const phoneHistoryTabs = ['Activity', 'Usage'];

const phoneHistoryFilters = ['All', 'Outlet 1', 'Outlet 2'];

const phoneHistorySummary = {
  activity: {
    records: '22',
    kwhTotal: '4.82',
    totalCost: 'PHP 28.92',
  },
  usage: {
    records: '36',
    kwhTotal: '19.00',
    totalCost: 'PHP 228.00',
  },
};

const phoneHistoryActivityItems = [
  {
    id: 'history-activity-1',
    name: 'Fan',
    appliance: 'No appliance',
    status: 'ON',
    time: '11:30 AM',
    date: 'Jul 17, 2026',
  },
  {
    id: 'history-activity-2',
    name: 'Phone Charger',
    appliance: 'No appliance',
    status: 'ON',
    time: '11:05 AM',
    date: 'Jul 17, 2026',
  },
  {
    id: 'history-activity-3',
    name: 'Phone Charger',
    appliance: 'No appliance',
    status: 'OFF',
    time: '10:45 AM',
    date: 'Jul 17, 2026',
  },
  {
    id: 'history-activity-4',
    name: 'Fan',
    appliance: 'No appliance',
    status: 'OFF',
    time: '9:28 PM',
    date: 'Apr 26, 2026',
  },
  {
    id: 'history-activity-5',
    name: 'Phone Charger',
    appliance: 'No appliance',
    status: 'ON',
    time: '9:25 PM',
    date: 'Apr 26, 2026',
  },
  {
    id: 'history-activity-6',
    name: 'Electric Fan',
    appliance: 'No appliance',
    status: 'ON',
    time: '9:23 PM',
    date: 'Apr 26, 2026',
  },
  {
    id: 'history-activity-7',
    name: 'Phone Charger',
    appliance: 'No appliance',
    status: 'OFF',
    time: '1:14 PM',
    date: 'Apr 26, 2026',
  },
];

const phoneHistoryUsageItems = [
  {
    id: 'history-usage-1',
    date: 'May 17',
    outlet1: '2.10 kWh',
    outlet2: '1.15 kWh',
    totalCost: 'PHP 39.00',
    totalKwh: '3.25 kWh',
  },
  {
    id: 'history-usage-2',
    date: 'May 16',
    outlet1: '1.95 kWh',
    outlet2: '1.25 kWh',
    totalCost: 'PHP 38.40',
    totalKwh: '3.20 kWh',
  },
  {
    id: 'history-usage-3',
    date: 'May 15',
    outlet1: '2.05 kWh',
    outlet2: '1.30 kWh',
    totalCost: 'PHP 40.20',
    totalKwh: '3.35 kWh',
  },
  {
    id: 'history-usage-4',
    date: 'May 14',
    outlet1: '1.80 kWh',
    outlet2: '1.20 kWh',
    totalCost: 'PHP 36.00',
    totalKwh: '3.00 kWh',
  },
  {
    id: 'history-usage-5',
    date: 'May 13',
    outlet1: '1.90 kWh',
    outlet2: '1.10 kWh',
    totalCost: 'PHP 36.00',
    totalKwh: '3.00 kWh',
  },
  {
    id: 'history-usage-6',
    date: 'May 12',
    outlet1: '2.15 kWh',
    outlet2: '1.05 kWh',
    totalCost: 'PHP 38.40',
    totalKwh: '3.20 kWh',
  },
];

const phoneScheduleSummary = [
  { label: 'Total', value: '0' },
  { label: 'Active', value: '0' },
  { label: '0 / 0', value: '01 / 02' },
];

const phoneScheduleFilters = ['All', 'Outlet 1', 'Outlet 2'];

const phoneScheduleTimerTypes = ['Countdown', 'Scheduled'];

const phoneScheduleActions = ['Turn ON', 'Turn OFF'];

const phoneScheduleDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const phoneNotifications = [
  {
    id: 'notif-1',
    title: 'High Peak Usage Alert',
    message: 'Multiple high-draw appliances detected. Please consider staggered use.',
    time: '9:38 AM',
    date: 'May 01, 2026',
  },
  {
    id: 'notif-2',
    title: 'Solar Array Output High',
    message: "Today's solar production is 125% of the forecasted average.",
    time: '9:35 AM',
    date: 'May 01, 2026',
  },
  {
    id: 'notif-3',
    title: 'Efficiency Report Available',
    message: 'Your complete April energy usage and efficiency summary is now ready to view.',
    time: '9:31 AM',
    date: 'May 01, 2026',
  },
];

const phoneSmartOutlets = [
  {
    id: 'smart-outlet-1',
    name: 'Phone Charger',
    subtitle: 'Relay CH1 / PZEM 2',
    status: 'OFF',
    metrics: [
      { label: 'Power', value: '0.0 W', short: 'P' },
      { label: 'Voltage', value: '0.0 V', short: 'V' },
      { label: 'Current', value: '0.000 A', short: 'A' },
      { label: 'Energy', value: '0.000 kWh', short: 'E' },
    ],
    suggestion: 'Electric Fan',
    confidence: '99%',
  },
  {
    id: 'smart-outlet-2',
    name: 'Electric Fan',
    subtitle: 'Relay CH2 / PZEM 1',
    status: 'OFF',
    metrics: [
      { label: 'Power', value: '0.0 W', short: 'P' },
      { label: 'Voltage', value: '0.0 V', short: 'V' },
      { label: 'Current', value: '0.000 A', short: 'A' },
      { label: 'Energy', value: '0.000 kWh', short: 'E' },
    ],
    suggestion: 'Phone Charger',
    confidence: '99%',
  },
];

const phoneSafetyThresholds = [
  {
    label: 'Voltage Range',
    value: '200V - 250V',
  },
  {
    label: 'Max Current',
    value: '10A',
  },
  {
    label: 'Max Power',
    value: '2000W',
  },
];

const phoneSafetyOutletStatus = [
  {
    id: 'safety-outlet-1',
    label: 'Outlet 1',
    status: 'Critical',
    metrics: [
      { label: 'Voltage', value: '0.0 V' },
      { label: 'Current', value: '0.00 A' },
      { label: 'Power', value: '0.0 W' },
      { label: 'Limit', value: '2000 W' },
    ],
  },
  {
    id: 'safety-outlet-2',
    label: 'Outlet 2',
    status: 'Critical',
    metrics: [
      { label: 'Voltage', value: '0.0 V' },
      { label: 'Current', value: '0.00 A' },
      { label: 'Power', value: '0.0 W' },
      { label: 'Limit', value: '2000 W' },
    ],
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

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});

export default function LandingPage() {
  const [activeOutletId, setActiveOutletId] = useState(outletCards[0].id);
  const [usageTarget, setUsageTarget] = useState(320);
  const [ratePerKwh, setRatePerKwh] = useState(0.15);
  const [mode, setMode] = useState<'eco' | 'comfort'>('eco');
  const [autoShutdown, setAutoShutdown] = useState(true);
  const [activeFeatureId, setActiveFeatureId] = useState(featureHighlights[0].id);
  const [activePhoneScreenId, setActivePhoneScreenId] = useState(phoneScreens[0].id);
  const [phoneAutoRotate, setPhoneAutoRotate] = useState(true);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'activity' | 'usage'>('activity');
  const [featureAutoRotate, setFeatureAutoRotate] = useState(true);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [splashLeaving, setSplashLeaving] = useState(false);
  const [showPairingSteps, setShowPairingSteps] = useState(false);
  const featurePauseTimeoutRef = useRef<number | null>(null);
  const phonePauseTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const shouldShowSplash = window.innerWidth >= 1024 && !prefersReducedMotion;

    if (!shouldShowSplash) {
      return;
    }

    const showTimer = window.setTimeout(() => setShowSplash(true), 120);
    const leaveTimer = window.setTimeout(() => setSplashLeaving(true), 700);
    const hideTimer = window.setTimeout(() => {
      setShowSplash(false);
      setSplashLeaving(false);
    }, 1100);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(leaveTimer);
      window.clearTimeout(hideTimer);
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
    if (!phoneAutoRotate) {
      return;
    }

    const interval = window.setInterval(() => {
      setActivePhoneScreenId((current) => {
        const currentIndex = phoneScreens.findIndex((screen) => screen.id === current);
        const nextIndex = (currentIndex + 1) % phoneScreens.length;
        return phoneScreens[nextIndex].id;
      });
    }, 7500);

    return () => window.clearInterval(interval);
  }, [phoneAutoRotate]);

  useEffect(() => {
    return () => {
      if (featurePauseTimeoutRef.current !== null) {
        window.clearTimeout(featurePauseTimeoutRef.current);
      }
      if (phonePauseTimeoutRef.current !== null) {
        window.clearTimeout(phonePauseTimeoutRef.current);
      }
    };
  }, []);

  const activeOutlet = outletCards.find((outlet) => outlet.id === activeOutletId) ?? outletCards[0];
  const activeFeature =
    featureHighlights.find((feature) => feature.id === activeFeatureId) ?? featureHighlights[0];
  const activePhoneScreen =
    phoneScreens.find((screen) => screen.id === activePhoneScreenId) ?? phoneScreens[0];
  const activeHistorySummary = phoneHistorySummary[activeHistoryTab];
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

  const pausePhoneRotation = () => {
    if (phonePauseTimeoutRef.current !== null) {
      window.clearTimeout(phonePauseTimeoutRef.current);
    }
    setPhoneAutoRotate(false);
    phonePauseTimeoutRef.current = window.setTimeout(() => {
      setPhoneAutoRotate(true);
    }, 12000);
  };

  const handlePhoneScreenSelect = (screenId: string) => {
    pausePhoneRotation();
    setActivePhoneScreenId(screenId);
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
            <a href="#how-it-works" className="hover:text-[color:var(--color-primary)]">
              How it works
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

      <main className="pb-24 md:pb-0">
        <section className="mx-auto grid max-w-7xl gap-12 px-6 pb-16 pt-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--color-primary-dark)]">
              Desktop energy companion
            </p>
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl font-['Space_Grotesk']">
              See every watt in your space and act before the bill hits.
            </h1>
            <p className="text-sm font-semibold text-[color:var(--color-primary-dark)]">
              Built for apartment managers, co-working teams, and energy-aware households.
            </p>
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

          <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur sm:shadow-xl">
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

        <section id="trust" className="py-12">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-8 rounded-3xl border border-white/70 bg-white/80 p-8 shadow-lg sm:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--color-text-light)]">
                  Early access teams
                </p>
                <h2 className="mt-3 text-2xl font-semibold font-['Space_Grotesk']">
                  Trusted by energy-focused operators.
                </h2>
                <p className="mt-3 text-[color:var(--color-text-light)]">
                  Teams use WattWise to keep shared spaces efficient, safe, and accountable.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {trustTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[color:var(--color-border)] bg-white px-3 py-1 text-xs font-semibold text-[color:var(--color-text)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-text-light)]">
                    Platform stack
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {trustStack.map((stack) => (
                      <span
                        key={stack}
                        className="rounded-full border border-[color:var(--color-border)] bg-white px-3 py-1 text-xs font-semibold text-[color:var(--color-text)]"
                      >
                        {stack}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid gap-3">
                {testimonials.map((testimonial) => (
                  <div
                    key={testimonial.name}
                    className="rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-4"
                  >
                    <p className="text-sm text-[color:var(--color-text)]">"{testimonial.quote}"</p>
                    <p className="mt-3 text-xs font-semibold text-[color:var(--color-text)]">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-[color:var(--color-text-light)]">
                      {testimonial.role}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-16">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--color-text-light)]">
                  How it works
                </p>
                <h2 className="mt-3 text-3xl font-semibold font-['Space_Grotesk']">
                  Four steps to a calmer power bill.
                </h2>
              </div>
              <a
                href="/register"
                className="rounded-full border border-[color:var(--color-border)] px-4 py-2 text-sm font-semibold text-[color:var(--color-text)] transition hover:border-[color:var(--color-primary)]"
              >
                Start in minutes
              </a>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              {howItWorksSteps.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-2xl border border-white/70 bg-white/80 px-4 py-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                      {index + 1}
                    </span>
                    <p className="text-sm font-semibold">{step.title}</p>
                  </div>
                  <p className="mt-3 text-xs text-[color:var(--color-text-light)]">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
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

        <section id="phone" className="py-16">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--color-text-light)]">
                  Phone features
                </p>
                <h2 className="mt-3 text-3xl font-semibold font-['Space_Grotesk']">
                  A mobile snapshot that mirrors the dashboard.
                </h2>
                <p className="mt-4 text-[color:var(--color-text-light)]">
                  WattWise mobile keeps a live household snapshot on hand, with outlet controls and
                  telemetry packed into a compact view.
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {phoneFeatureHighlights.map((feature) => (
                    <div
                      key={feature.title}
                      className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm"
                    >
                      <p className="text-sm font-semibold">{feature.title}</p>
                      <p className="mt-1 text-xs text-[color:var(--color-text-light)]">
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-center lg:justify-end">
                <div className="w-full max-w-[360px]">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                      {phoneScreens.map((screen) => (
                        <button
                          key={screen.id}
                          type="button"
                          onClick={() => handlePhoneScreenSelect(screen.id)}
                          onFocus={() => handlePhoneScreenSelect(screen.id)}
                          onMouseEnter={() => handlePhoneScreenSelect(screen.id)}
                          aria-pressed={activePhoneScreenId === screen.id}
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
                            activePhoneScreenId === screen.id
                              ? 'bg-emerald-500 text-white'
                              : 'bg-white text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {screen.label}
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-text-light)]">
                      {activePhoneScreen.label}
                    </span>
                  </div>
                  <div
                    className="rounded-[2.75rem] border border-emerald-100/80 bg-white/90 p-4 shadow-xl sm:shadow-2xl"
                    onMouseEnter={pausePhoneRotation}
                    onFocusCapture={pausePhoneRotation}
                    onTouchStart={pausePhoneRotation}
                  >
                    <div className="mx-auto h-6 w-24 rounded-full bg-emerald-100/70" />
                    <div className="mt-4 space-y-4">
                      {activePhoneScreenId === 'snapshot' && (
                        <div className="phone-screen-in">
                          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 p-4 text-white shadow-lg">
                            <div className="absolute -right-10 -top-12 h-28 w-28 rounded-full bg-white/20" />
                            <div className="absolute right-6 top-8 h-16 w-16 rounded-full bg-white/10" />
                            <div className="relative z-10">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/75">
                                    Live household snapshot
                                  </p>
                                  <p className="mt-1 text-xs font-semibold">Total Energy Usage</p>
                                </div>
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                                  <svg
                                    viewBox="0 0 24 24"
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                  >
                                    <path d="M13 2L3 14h6l-2 8 10-12h-6L13 2z" />
                                  </svg>
                                </div>
                              </div>
                              <p className="mt-3 text-2xl font-semibold">1.98 kWh</p>
                              <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
                                {phoneSnapshotSummary.map((summary) => (
                                  <div
                                    key={summary.label}
                                    className="rounded-xl border border-white/20 bg-white/10 px-3 py-2"
                                  >
                                    <p className="text-[9px] uppercase tracking-[0.2em] text-white/70">
                                      {summary.label}
                                    </p>
                                    <p className="mt-1 text-sm font-semibold">{summary.value}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-gray-700">Smart Outlets</p>
                            <div className="mt-3 space-y-3">
                              {phoneOutletPreviews.map((outlet) => (
                                <div
                                  key={outlet.id}
                                  className="rounded-2xl border border-emerald-100/70 bg-white px-3 py-3 shadow-sm"
                                >
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold">{outlet.label}</p>
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                      {outlet.status}
                                    </span>
                                  </div>
                                  <div className="mt-3 grid grid-cols-4 gap-2">
                                    {outlet.metrics.map((metric) => (
                                      <div
                                        key={metric.label}
                                        className="rounded-xl bg-gray-50 px-2 py-2 text-center"
                                      >
                                        <p className="text-[9px] uppercase tracking-[0.15em] text-gray-400">
                                          {metric.label}
                                        </p>
                                        <p className="mt-1 text-xs font-semibold text-gray-800">
                                          {metric.value}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                  <button
                                    type="button"
                                    aria-label={`Turn off ${outlet.label}`}
                                    className="mt-3 w-full rounded-xl bg-emerald-500 px-3 py-2 text-[11px] font-semibold text-white"
                                  >
                                    Turn OFF
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {activePhoneScreenId === 'outlets' && (
                        <div className="phone-screen-in space-y-3 text-[11px] text-gray-600">
                          <p className="text-sm font-semibold text-gray-800">Smart Outlets</p>
                          <div className="space-y-3">
                            {phoneSmartOutlets.map((outlet) => (
                              <div
                                key={outlet.id}
                                className="rounded-2xl border border-gray-100 bg-white px-3 py-3"
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-[12px] font-semibold text-gray-800">
                                        {outlet.name}
                                      </p>
                                      <button
                                        type="button"
                                        className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"
                                        aria-label={`Edit ${outlet.name}`}
                                      >
                                        <svg
                                          viewBox="0 0 24 24"
                                          className="h-3 w-3"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          aria-hidden="true"
                                        >
                                          <path d="M12 20h9" />
                                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                                        </svg>
                                      </button>
                                    </div>
                                    <p className="text-[9px] text-gray-400">{outlet.subtitle}</p>
                                  </div>
                                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-semibold text-gray-500">
                                    {outlet.status}
                                  </span>
                                </div>

                                <div className="mt-3 grid grid-cols-4 gap-2">
                                  {outlet.metrics.map((metric) => (
                                    <div
                                      key={metric.label}
                                      className="rounded-xl bg-gray-50 px-2 py-2 text-center"
                                    >
                                      <div className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-[9px] font-semibold text-emerald-600">
                                        {metric.short}
                                      </div>
                                      <p className="text-[10px] font-semibold text-gray-800">
                                        {metric.value}
                                      </p>
                                      <p className="text-[8px] uppercase tracking-[0.15em] text-gray-400">
                                        {metric.label}
                                      </p>
                                    </div>
                                  ))}
                                </div>

                                <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2">
                                  <p className="text-[10px] font-semibold text-emerald-700">
                                    Suggested: {outlet.suggestion} ({outlet.confidence})
                                  </p>
                                  <button
                                    type="button"
                                    className="rounded-full bg-emerald-500 px-3 py-1 text-[9px] font-semibold text-white"
                                  >
                                    Accept
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  className="mt-3 w-full rounded-xl bg-emerald-500 px-3 py-2 text-[11px] font-semibold text-white"
                                >
                                  Turn ON
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activePhoneScreenId === 'usage' && (
                        <div className="phone-screen-in space-y-3 text-[11px] text-gray-600">
                          <div className="rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 px-4 py-3 text-white">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-[10px] text-white/75">Total Energy Usage</p>
                                <p className="mt-1 text-2xl font-semibold">350.00 kWh</p>
                                <p className="text-[10px] text-white/75">PHP 4,375.00 estimated cost</p>
                              </div>
                              <span className="rounded-full bg-white/15 px-2 py-1 text-[9px] font-semibold">
                                Monthly
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            {phoneUsageTabs.map((tab) => (
                              <button
                                key={tab}
                                type="button"
                                className={`rounded-full px-3 py-1 text-[10px] font-semibold transition ${
                                  tab === 'Monthly'
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-white text-gray-500 border border-gray-100'
                                }`}
                                aria-pressed={tab === 'Monthly'}
                              >
                                {tab}
                              </button>
                            ))}
                          </div>

                          <div className="rounded-2xl border border-gray-100 bg-white px-3 py-3">
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] font-semibold text-gray-700">Energy Consumption</p>
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-semibold text-emerald-600">
                                Peak: 6.5 kWh
                              </span>
                            </div>
                            <div className="mt-3 grid grid-cols-4 items-end gap-2">
                              {phoneUsageBars.map((bar) => (
                                <div key={bar.label} className="flex flex-col items-center gap-2">
                                  <span className="text-[9px] font-semibold text-gray-500">
                                    {bar.value}
                                  </span>
                                  <div className="h-28 w-full rounded-full bg-emerald-50">
                                    <div
                                      className="w-full rounded-full bg-emerald-500"
                                      style={{ height: `${Math.min(100, (bar.value / 120) * 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-[9px] text-gray-400">{bar.label}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {activePhoneScreenId === 'history' && (
                        <div className="phone-screen-in space-y-3 text-[11px] text-gray-600">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">History</p>
                            <p className="text-[10px] text-gray-400">Activity &amp; usage records</p>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 text-center">
                              <p className="text-sm font-semibold text-emerald-600">
                                {activeHistorySummary.records}
                              </p>
                              <p className="text-[9px] text-gray-400">Records</p>
                            </div>
                            <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 text-center">
                              <p className="text-sm font-semibold text-emerald-600">
                                {activeHistorySummary.kwhTotal}
                              </p>
                              <p className="text-[9px] text-gray-400">kWh Total</p>
                            </div>
                            <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 text-center">
                              <p className="text-sm font-semibold text-emerald-600">
                                {activeHistorySummary.totalCost}
                              </p>
                              <p className="text-[9px] text-gray-400">Total Cost</p>
                            </div>
                          </div>

                          <div className="rounded-full border border-gray-100 bg-white p-1">
                            <div className="grid grid-cols-2 gap-2">
                              {phoneHistoryTabs.map((tab) => {
                                const isActive =
                                  (tab === 'Activity' && activeHistoryTab === 'activity') ||
                                  (tab === 'Usage' && activeHistoryTab === 'usage');
                                return (
                                  <button
                                    key={tab}
                                    type="button"
                                    onClick={() =>
                                      setActiveHistoryTab(tab === 'Activity' ? 'activity' : 'usage')
                                    }
                                    className={`rounded-full px-3 py-1 text-[10px] font-semibold transition ${
                                      isActive
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-transparent text-gray-500'
                                    }`}
                                    aria-pressed={isActive}
                                  >
                                    {tab}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap gap-2">
                              {phoneHistoryFilters.map((filter) => (
                                <button
                                  key={filter}
                                  type="button"
                                  className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
                                    filter === 'All'
                                      ? 'bg-emerald-500 text-white'
                                      : 'border border-gray-100 bg-white text-gray-500'
                                  }`}
                                  aria-pressed={filter === 'All'}
                                >
                                  {filter}
                                </button>
                              ))}
                            </div>
                            <button
                              type="button"
                              className="flex items-center gap-1 rounded-full border border-gray-100 bg-white px-3 py-1 text-[10px] font-semibold text-gray-500"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                className="h-3 w-3"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                              </svg>
                              Date
                            </button>
                          </div>

                          {activeHistoryTab === 'activity' && (
                            <div className="space-y-2">
                              {phoneHistoryActivityItems.map((item) => (
                                <div
                                  key={item.id}
                                  className="rounded-xl border border-gray-100 bg-white px-3 py-2"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-2">
                                      <span
                                        className={`mt-1 h-2 w-2 rounded-full ${
                                          item.status === 'ON' ? 'bg-emerald-500' : 'bg-gray-300'
                                        }`}
                                      />
                                      <div>
                                        <p className="text-[11px] font-semibold text-gray-700">
                                          {item.name}
                                        </p>
                                        <p className="text-[9px] text-gray-400">{item.appliance}</p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <span
                                        className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                                          item.status === 'ON'
                                            ? 'bg-emerald-100 text-emerald-600'
                                            : 'bg-gray-100 text-gray-500'
                                        }`}
                                      >
                                        {item.status}
                                      </span>
                                      <p className="mt-1 text-[9px] text-gray-500">
                                        {item.time}
                                      </p>
                                      <p className="text-[9px] text-gray-400">{item.date}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {activeHistoryTab === 'usage' && (
                            <div className="space-y-2">
                              {phoneHistoryUsageItems.map((item) => (
                                <div
                                  key={item.id}
                                  className="rounded-xl border border-gray-100 bg-white px-3 py-2"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <p className="text-[10px] font-semibold text-gray-500">
                                        {item.date}
                                      </p>
                                      <p className="text-[9px] text-gray-400">Outlet 1</p>
                                      <p className="text-[9px] text-gray-400">Outlet 2</p>
                                    </div>
                                    <div className="text-right text-[9px] text-gray-500">
                                      <p className="font-semibold text-gray-700">{item.outlet1}</p>
                                      <p className="font-semibold text-gray-700">{item.outlet2}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[9px] text-gray-400">Total Cost</p>
                                      <p className="text-[11px] font-semibold text-emerald-600">
                                        {item.totalCost}
                                      </p>
                                      <p className="text-[9px] text-gray-400">{item.totalKwh}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {activePhoneScreenId === 'schedule' && (
                        <div className="phone-screen-in space-y-3 text-[11px] text-gray-600">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">Schedule</p>
                              <p className="text-[10px] text-gray-400">Automate your outlets</p>
                            </div>
                            <button
                              type="button"
                              className="rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-semibold text-white"
                            >
                              + Add
                            </button>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            {phoneScheduleSummary.map((summary) => (
                              <div
                                key={summary.label}
                                className="rounded-xl border border-gray-100 bg-white px-3 py-2 text-center"
                              >
                                <p className="text-sm font-semibold text-emerald-600">
                                  {summary.value}
                                </p>
                                <p className="text-[9px] text-gray-400">{summary.label}</p>
                              </div>
                            ))}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {phoneScheduleFilters.map((filter) => (
                              <button
                                key={filter}
                                type="button"
                                className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
                                  filter === 'All'
                                    ? 'bg-emerald-500 text-white'
                                    : 'border border-gray-100 bg-white text-gray-500'
                                }`}
                                aria-pressed={filter === 'All'}
                              >
                                {filter}
                              </button>
                            ))}
                          </div>

                          <div className="rounded-2xl border border-gray-100 bg-white/90 px-3 py-3 shadow-sm">
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] font-semibold text-gray-700">Add Timer</p>
                              <button type="button" className="text-[11px] text-gray-400">
                                X
                              </button>
                            </div>
                            <div className="mt-3 space-y-3">
                              <div>
                                <p className="text-[9px] uppercase tracking-[0.2em] text-gray-400">
                                  Timer Type
                                </p>
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                  {phoneScheduleTimerTypes.map((type) => (
                                    <button
                                      key={type}
                                      type="button"
                                      className={`rounded-xl px-3 py-2 text-[10px] font-semibold ${
                                        type === 'Scheduled'
                                          ? 'bg-emerald-500 text-white'
                                          : 'border border-gray-100 bg-white text-gray-500'
                                      }`}
                                      aria-pressed={type === 'Scheduled'}
                                    >
                                      {type}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <p className="text-[9px] uppercase tracking-[0.2em] text-gray-400">
                                  Select Outlet
                                </p>
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                  {['Outlet 1', 'Outlet 2'].map((outlet) => (
                                    <button
                                      key={outlet}
                                      type="button"
                                      className={`rounded-xl px-3 py-2 text-[10px] font-semibold ${
                                        outlet === 'Outlet 1'
                                          ? 'bg-emerald-500 text-white'
                                          : 'border border-gray-100 bg-white text-gray-500'
                                      }`}
                                      aria-pressed={outlet === 'Outlet 1'}
                                    >
                                      {outlet}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <p className="text-[9px] uppercase tracking-[0.2em] text-gray-400">
                                  Action
                                </p>
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                  {phoneScheduleActions.map((action) => (
                                    <button
                                      key={action}
                                      type="button"
                                      className={`rounded-xl px-3 py-2 text-[10px] font-semibold ${
                                        action === 'Turn ON'
                                          ? 'bg-emerald-500 text-white'
                                          : 'border border-gray-100 bg-white text-gray-500'
                                      }`}
                                      aria-pressed={action === 'Turn ON'}
                                    >
                                      {action}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <p className="text-[9px] uppercase tracking-[0.2em] text-gray-400">
                                  Set Time
                                </p>
                                <div className="mt-2 rounded-xl border border-gray-100 bg-white px-3 py-3 text-center">
                                  <div className="flex items-center justify-center gap-4 text-2xl font-semibold text-gray-800">
                                    <div>
                                      <p className="text-[9px] text-gray-400">HH</p>
                                      <p>00</p>
                                    </div>
                                    <span className="text-gray-300">:</span>
                                    <div>
                                      <p className="text-[9px] text-gray-400">MM</p>
                                      <p>00</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <p className="text-[9px] uppercase tracking-[0.2em] text-gray-400">
                                  Repeat Days
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {phoneScheduleDays.map((day) => (
                                    <button
                                      key={day}
                                      type="button"
                                      className="rounded-full border border-gray-100 bg-white px-3 py-1 text-[10px] font-semibold text-gray-500"
                                    >
                                      {day}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  className="rounded-xl border border-gray-100 bg-white px-3 py-2 text-[10px] font-semibold text-gray-500"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  className="rounded-xl bg-emerald-500 px-3 py-2 text-[10px] font-semibold text-white"
                                >
                                  Save Timer
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activePhoneScreenId === 'notifications' && (
                        <div className="phone-screen-in space-y-3 text-[11px] text-gray-600">
                          <div className="rounded-2xl border border-gray-100 bg-white px-3 py-3 shadow-sm">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-gray-800">Notifications</p>
                                <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                                  3
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700"
                                >
                                  Mark all read
                                </button>
                                <button
                                  type="button"
                                  className="text-[10px] font-semibold text-gray-400"
                                >
                                  Close
                                </button>
                                <button
                                  type="button"
                                  aria-label="Close"
                                  className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-100 text-gray-400"
                                >
                                  X
                                </button>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-[10px] text-gray-500">
                              <span>3 unread</span>
                              <button type="button" className="font-semibold text-rose-400">
                                Clear All
                              </button>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {phoneNotifications.map((notification) => (
                              <div
                                key={notification.id}
                                className="rounded-2xl border border-gray-100 bg-emerald-50/60 px-3 py-3"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                                    <svg
                                      viewBox="0 0 24 24"
                                      className="h-4 w-4"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      aria-hidden="true"
                                    >
                                      <path d="M13 2L3 14h6l-2 8 10-12h-6L13 2z" />
                                    </svg>
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-[11px] font-semibold text-gray-800">
                                      {notification.title}
                                    </p>
                                    <p className="text-[10px] text-gray-600">
                                      {notification.message}
                                    </p>
                                    <p className="mt-2 text-[9px] text-gray-400">
                                      {notification.time} · {notification.date}
                                    </p>
                                  </div>
                                  <span className="mt-1 h-2 w-2 rounded-full bg-amber-400" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activePhoneScreenId === 'safety' && (
                        <div className="phone-screen-in space-y-3 text-[11px] text-gray-600">
                          <div className="flex items-center justify-between px-1">
                            <button
                              type="button"
                              aria-label="Back"
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-500"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="M15 18l-6-6 6-6" />
                              </svg>
                            </button>
                            <p className="text-xs font-semibold text-gray-700">Power Safety</p>
                            <span className="h-7 w-7" />
                          </div>

                          <div className="rounded-2xl border border-emerald-100/70 bg-emerald-50/70 px-3 py-3">
                            <div className="flex items-start gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                <svg
                                  viewBox="0 0 24 24"
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                >
                                  <path d="M12 3l7 4v5c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V7l7-4z" />
                                  <path d="M9 12l2 2 4-4" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-[9px] uppercase tracking-[0.2em] text-emerald-600">
                                  Current Status
                                </p>
                                <p className="text-sm font-semibold text-emerald-700">Normal</p>
                                <p className="text-[10px] text-emerald-700/80">
                                  All systems operating within safe parameters
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 space-y-2">
                              <div className="h-1.5 w-full rounded-full bg-emerald-100">
                                <div className="h-1.5 w-1/3 rounded-full bg-emerald-500" />
                              </div>
                              <div className="grid grid-cols-4 text-[9px] uppercase tracking-[0.15em]">
                                {phoneSafetySteps.map((step, index) => (
                                  <span
                                    key={step}
                                    className={index === 0 ? 'text-emerald-600' : 'text-gray-400'}
                                  >
                                    {step}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div>
                            <p className="text-[11px] font-semibold text-gray-700">Protection Settings</p>
                            <div className="mt-2 rounded-xl border border-gray-100 bg-white px-3 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-[11px] font-semibold text-gray-700">Auto Cut-off</p>
                                  <p className="text-[9px] text-gray-400">
                                    Automatically cut power when limits are exceeded
                                  </p>
                                </div>
                                <span className="relative h-6 w-10 rounded-full bg-emerald-500">
                                  <span className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white" />
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-xl border border-gray-100 bg-white px-3 py-3">
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] font-semibold text-gray-700">Safety Thresholds</p>
                              <button
                                type="button"
                                className="text-[10px] font-semibold text-emerald-600"
                              >
                                Edit
                              </button>
                            </div>
                            <div className="mt-2 space-y-2">
                              {phoneSafetyThresholds.map((threshold) => (
                                <div
                                  key={threshold.label}
                                  className="flex items-center justify-between text-[10px] text-gray-500"
                                >
                                  <span>{threshold.label}</span>
                                  <span className="font-semibold text-gray-800">{threshold.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="text-[11px] font-semibold text-gray-700">Outlet Status</p>
                            <div className="mt-2 space-y-2">
                              {phoneSafetyOutletStatus.map((outlet) => (
                                <div
                                  key={outlet.id}
                                  className="rounded-xl border border-gray-100 bg-white px-3 py-3"
                                >
                                  <div className="flex items-center justify-between">
                                    <p className="text-[11px] font-semibold text-gray-700">
                                      {outlet.label}
                                    </p>
                                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-semibold text-rose-600">
                                      {outlet.status}
                                    </span>
                                  </div>
                                  <div className="mt-2 grid grid-cols-4 gap-2">
                                    {outlet.metrics.map((metric) => (
                                      <div
                                        key={metric.label}
                                        className="rounded-lg bg-gray-50 px-2 py-2 text-center"
                                      >
                                        <p className="text-[8px] uppercase tracking-[0.15em] text-gray-400">
                                          {metric.label}
                                        </p>
                                        <p className="mt-1 text-[10px] font-semibold text-gray-800">
                                          {metric.value}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-xl border border-gray-100 bg-white px-3 py-3 text-center">
                            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                              <svg
                                viewBox="0 0 24 24"
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="M12 3l7 4v5c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V7l7-4z" />
                              </svg>
                            </div>
                            <p className="mt-2 text-[11px] font-semibold text-gray-700">No Safety Alerts</p>
                            <p className="text-[9px] text-gray-400">
                              All systems operating within safe parameters
                            </p>
                          </div>

                          <p className="text-[9px] text-gray-400">
                            Protection system monitors voltage, current, and power levels to ensure
                            safe operation.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[10px] text-[color:var(--color-text-light)]">
                    <div className="flex items-center gap-2">
                      {phoneScreens.map((screen) => (
                        <button
                          key={screen.id}
                          type="button"
                          onClick={() => handlePhoneScreenSelect(screen.id)}
                          aria-label={`Show ${screen.label}`}
                          aria-pressed={activePhoneScreenId === screen.id}
                          className={`h-2.5 w-2.5 rounded-full border transition ${
                            activePhoneScreenId === screen.id
                              ? 'border-emerald-500 bg-emerald-500'
                              : 'border-emerald-200 bg-white hover:bg-emerald-50'
                          }`}
                        >
                          <span className="sr-only">{screen.label}</span>
                        </button>
                      ))}
                    </div>
                    <span>{phoneAutoRotate ? 'Auto-rotate on' : 'Paused'}</span>
                  </div>
                  <p className="mt-2 text-xs text-[color:var(--color-text-light)]">
                    {activePhoneScreen.description}
                  </p>
                  <p className="mt-2 text-[10px] text-[color:var(--color-text-light)]">
                    Tap or hover to preview.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="mx-auto max-w-6xl px-6">
            <div className="rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 p-8 text-white shadow-lg sm:shadow-xl">
              <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-white/70">
                    Ready to launch
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold font-['Space_Grotesk']">
                    Bring live energy control to your desktop today.
                  </h2>
                  <p className="mt-3 text-sm text-white/80">
                    Start monitoring two smart outlets with real-time alerts and export-ready reports.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 md:justify-end">
                  <a
                    href="/register"
                    className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                  >
                    Get started
                  </a>
                  <a
                    href="#phone"
                    className="rounded-full border border-white/40 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white"
                  >
                    See mobile preview
                  </a>
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
          <div className="rounded-3xl border border-white/70 bg-gray-900 p-8 text-white shadow-lg sm:shadow-xl">
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

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/70 bg-white/90 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <div>
            <p className="text-xs text-[color:var(--color-text-light)]">Live energy control</p>
            <p className="text-sm font-semibold text-[color:var(--color-text)]">Start with WattWise</p>
          </div>
          <a
            href="/register"
            className="rounded-full bg-[color:var(--color-primary)] px-4 py-2 text-xs font-semibold text-white"
          >
            Get started
          </a>
        </div>
      </div>
    </div>
  );
}
