import { useState, type FormEvent } from 'react'

const outletSnapshots = [
  {
    id: 'outlet1',
    label: 'Outlet 1',
    location: 'Kitchen',
    status: 'On',
    watts: 420,
    voltage: 120,
    current: 3.5,
    todayKwh: 2.8,
  },
  {
    id: 'outlet2',
    label: 'Outlet 2',
    location: 'Living Room',
    status: 'Standby',
    watts: 95,
    voltage: 120,
    current: 0.8,
    todayKwh: 0.9,
  },
]

const faqItems = [
  {
    question: 'Does WattWise work without Wi-Fi?',
    answer:
      'Live monitoring requires Wi-Fi, but safety shutoffs and schedules keep running on the device.',
  },
  {
    question: 'How many outlets are supported right now?',
    answer:
      'The beta supports two outlets. Multi-room expansion is planned once the core dashboard is stable.',
  },
  {
    question: 'Can I export my data?',
    answer:
      'Yes. You can export CSV, Excel, or PDF reports directly from the dashboard.',
  },
]

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const decimalFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
})

export default function LandingPage() {
  const [activeOutletId, setActiveOutletId] = useState(outletSnapshots[0].id)
  const [monthlyKwh, setMonthlyKwh] = useState(420)
  const [savingsMode, setSavingsMode] = useState<'eco' | 'comfort'>('eco')
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const activeOutlet =
    outletSnapshots.find((outlet) => outlet.id === activeOutletId) ?? outletSnapshots[0]
  const loadPercent = Math.min(100, Math.round((activeOutlet.watts / 1200) * 100))
  const ratePerKwh = 0.15
  const savingsRate = savingsMode === 'eco' ? 0.18 : 0.12
  const monthlyCost = monthlyKwh * ratePerKwh
  const monthlySavings = monthlyCost * savingsRate
  const annualSavings = monthlySavings * 12

  const handleNotifySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim()) {
      return
    }
    setIsSubmitted(true)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top,_#ecfdf3_0%,_#f8fafc_45%,_#ffffff_100%)] font-['Space_Grotesk'] text-gray-900">
      <div
        className="pointer-events-none absolute -top-20 right-0 h-72 w-72 rounded-full bg-green-200/40 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-emerald-100/50 blur-3xl"
        aria-hidden="true"
      />

      {/* Header */}
      <header className="bg-white/80 shadow-sm backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              W
            </div>
            <span className="text-2xl font-bold text-gray-900">WattWise</span>
          </div>
          <a
            href="/login"
            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
          >
            Login
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid gap-12 md:grid-cols-[1.1fr_0.9fr] items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-green-700 mb-4">
              Smart energy for small spaces
            </p>
            <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Monitor your energy.
              <br />
              Save money without guesswork.
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl">
              WattWise helps you track real-time energy consumption from smart outlets,
              analyze usage patterns, set budgets, and control appliances remotely.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="/register"
                className="px-8 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition"
              >
                Get Started
              </a>
              <a
                href="#preview"
                className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-green-500 hover:text-green-500 transition"
              >
                Live Preview
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white/90 p-6 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Live Outlet Snapshot</h2>
              <span className="text-xs uppercase tracking-widest text-green-600">Demo</span>
            </div>
            <div className="mt-4 flex gap-2">
              {outletSnapshots.map((outlet) => (
                <button
                  key={outlet.id}
                  type="button"
                  onClick={() => setActiveOutletId(outlet.id)}
                  aria-pressed={activeOutletId === outlet.id}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    activeOutletId === outlet.id
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-green-50'
                  }`}
                >
                  {outlet.label}
                </button>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Power</p>
                <p className="text-2xl font-semibold text-gray-900">{activeOutlet.watts}W</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Voltage</p>
                <p className="text-2xl font-semibold text-gray-900">{activeOutlet.voltage}V</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Current</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {decimalFormatter.format(activeOutlet.current)}A
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Today</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {decimalFormatter.format(activeOutlet.todayKwh)}kWh
                </p>
              </div>
            </div>
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Load</span>
                <span>{loadPercent}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-green-500 transition-all"
                  style={{ width: `${loadPercent}%` }}
                />
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {activeOutlet.location}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  activeOutlet.status === 'On'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {activeOutlet.status}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Savings Preview */}
      <section id="preview" className="bg-white/80 py-16 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 grid gap-10 md:grid-cols-2 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Estimate your savings in seconds
            </h2>
            <p className="text-gray-600 text-lg mb-6">
              Slide to match your monthly usage and toggle between Eco and Comfort modes to
              preview how WattWise optimizes your bill.
            </p>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Smart alerts keep loads balanced
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Schedule heavy appliances off-peak
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Spot idle devices instantly
              </li>
            </ul>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Savings Simulator</h3>
              <div className="flex gap-2">
                {(['eco', 'comfort'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSavingsMode(mode)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide transition ${
                      savingsMode === mode
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-green-50'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-6">
              <label className="text-sm text-gray-600">Monthly usage</label>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-gray-900">{monthlyKwh}</span>
                <span className="text-sm text-gray-500">kWh</span>
              </div>
              <input
                type="range"
                min={150}
                max={900}
                step={10}
                value={monthlyKwh}
                onChange={(event) => setMonthlyKwh(Number(event.target.value))}
                className="mt-4 w-full accent-green-500"
                aria-label="Monthly energy usage"
              />
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Bill</p>
                <p className="text-lg font-semibold text-gray-900">
                  {currencyFormatter.format(monthlyCost)}
                </p>
              </div>
              <div className="rounded-lg bg-green-50 p-3">
                <p className="text-xs uppercase tracking-wide text-green-700">Monthly</p>
                <p className="text-lg font-semibold text-green-700">
                  {currencyFormatter.format(monthlySavings)}
                </p>
              </div>
              <div className="rounded-lg bg-gray-900 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-300">Annual</p>
                <p className="text-lg font-semibold text-white">
                  {currencyFormatter.format(annualSavings)}
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-500">
              Based on an average rate of $0.15 per kWh. Demo numbers only.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center rounded-2xl border border-gray-100 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Real-Time Monitoring</h3>
              <p className="text-gray-600">Track power, voltage, and current from 2 smart outlets in real-time.</p>
            </div>

            <div className="text-center rounded-2xl border border-gray-100 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Usage Analytics</h3>
              <p className="text-gray-600">Visualize daily, weekly, and monthly energy consumption trends.</p>
            </div>

            <div className="text-center rounded-2xl border border-gray-100 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Budget Management</h3>
              <p className="text-gray-600">Set monthly budgets and get alerts when reaching thresholds.</p>
            </div>

            <div className="text-center rounded-2xl border border-gray-100 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Smart Scheduling</h3>
              <p className="text-gray-600">Schedule outlet on/off times or set countdown timers.</p>
            </div>

            <div className="text-center rounded-2xl border border-gray-100 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Export Reports</h3>
              <p className="text-gray-600">Download usage data in CSV, Excel, or PDF formats.</p>
            </div>

            <div className="text-center rounded-2xl border border-gray-100 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Power Safety</h3>
              <p className="text-gray-600">Auto-shutdown on voltage/current spikes. Get instant alerts.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center">Questions answered</h2>
          <div className="mt-8 space-y-3">
            {faqItems.map((item, index) => {
              const isOpen = openFaqIndex === index
              return (
                <div key={item.question} className="rounded-2xl border border-gray-100 bg-white">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenFaqIndex((current) => (current === index ? null : index))
                    }
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${index}`}
                    className="w-full px-5 py-4 text-left flex items-center justify-between"
                  >
                    <span className="font-semibold text-gray-900">{item.question}</span>
                    <span
                      className={`text-xl font-bold transition ${
                        isOpen ? 'text-green-600' : 'text-gray-400'
                      }`}
                    >
                      {isOpen ? '-' : '+'}
                    </span>
                  </button>
                  <div
                    id={`faq-panel-${index}`}
                    className={`px-5 pb-4 text-gray-600 transition-all ${
                      isOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                    } overflow-hidden`}
                  >
                    {item.answer}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Status Banner */}
      <section className="bg-green-50 py-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-block px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold mb-4">
            🚧 Beta Testing
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            WattWise Web is currently in development
          </h2>
          <p className="text-gray-600 mb-6">
            This is a coded version for early testing. Features are being actively developed.
            Works best on desktop and tablet devices.
          </p>
          <form
            onSubmit={handleNotifySubmit}
            className="mx-auto flex flex-col sm:flex-row gap-3 justify-center max-w-xl"
          >
            <input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 focus:border-green-500 focus:outline-none"
            />
            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600 transition"
            >
              {isSubmitted ? 'Joined' : 'Notify Me'}
            </button>
          </form>
          <p className="text-sm text-gray-500 mt-3">
            {isSubmitted
              ? 'Thanks for joining. We will share early updates.'
              : 'No spam. We only email major milestones.'}
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Supports only 2 outlets (outlet1, outlet2) • Low-voltage appliances only
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-gray-400">© 2024 WattWise. All rights reserved.</p>
          <p className="text-sm text-gray-500 mt-2">Powered by Firebase • ESP32 • React</p>
        </div>
      </footer>
    </div>
  )
}