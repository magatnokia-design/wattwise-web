import { Link } from 'react-router-dom';
import PowerPreview from '../components/auth/PowerPreview';
import BackToTop from '../components/landing/BackToTop';
import CostEstimator from '../components/landing/CostEstimator';
import FaqSection from '../components/landing/FaqSection';
import SafetyDemo from '../components/landing/SafetyDemo';
import { BoltMark } from '../components/ui/BoltMark';
import { Wordmark } from '../components/ui/Wordmark';
import {
  ANDROID_APK_SIZE_MB,
  ANDROID_APK_URL,
  ANDROID_VERSION,
  RELEASES_URL,
  REPO_URL,
} from '../constants/appRelease';
import { scrollToTop } from '../utils/scrollToTop';
import styles from './LandingPage.module.css';

/**
 * What a signed-out visitor sees at the root.
 *
 * Until now the root redirected straight to /login, so the whole public face of
 * the project was a sign-in box — and on anything narrower than 980px it was
 * *only* a sign-in box, because the panel beside it was display:none. Someone
 * arriving from the APK link or a poster had no way to find out what the thing
 * did before being asked to authenticate to it.
 *
 * The rule the rest of the app follows applies here too: no number on this page
 * is invented. The estimator runs the real PELCO III module, the safety ladder
 * uses the real thresholds, and the accuracy figures are the measured bench
 * results including the one that missed. Nothing simulates a live reading.
 */

const FEATURES = [
  {
    icon: '📊',
    title: 'Both outlets, measured separately',
    body:
      'Each outlet has its own energy meter, so voltage, current, power and accumulated kWh are per-outlet — not a house total divided in half.',
  },
  {
    icon: '🧾',
    title: 'Priced on your actual tariff',
    body:
      'PELCO III residential rates, itemised across all three charge blocks. The model was reconciled against four real bills.',
  },
  {
    icon: '🔎',
    title: 'It suggests what is plugged in',
    body:
      'Eight appliance profiles matched from the load pattern. It only ever suggests — WattWise never renames an outlet on its own.',
  },
  {
    icon: '🛡️',
    title: 'Limits enforced in the hardware',
    body:
      '500 W per outlet, 1000 W in total, held by the ESP32 itself. A phone that is off or out of signal cannot raise them.',
  },
  {
    icon: '🚨',
    title: 'It notices a relay that will not open',
    body:
      'If an outlet is switched off but current keeps flowing, WattWise says so instead of showing it as off. This found a real welded contact.',
  },
  {
    icon: '⏱️',
    title: 'Schedules and budgets',
    body:
      'Switch an outlet on a timetable, set a monthly peso budget, and get told when you are heading past it.',
  },
  {
    icon: '📈',
    title: 'History you can take away',
    body:
      'Daily rollups, month-against-month comparison, and an Excel export of the underlying usage.',
  },
  {
    icon: '✉️',
    title: 'Alerts that leave the app',
    body:
      'Safety cutoffs, budget thresholds and monthly statements arrive by notification and email, not only on screen.',
  },
];

const STEPS = [
  {
    title: 'Set the Hub up from your phone',
    body:
      'The Hub raises its own Wi-Fi network the first time it starts. You join it, pick your home network and enter the password. Nothing is compiled into the firmware.',
  },
  {
    title: 'It measures, then reports',
    body:
      'Each outlet has a dedicated meter. Readings are validated against a device token and a freshness check before anything is written to your account.',
  },
  {
    title: 'You switch, it polls',
    body:
      'Toggling an outlet queues a command. The Hub asks for its next command, carries it out, and acknowledges it — so an unacknowledged command is visible rather than silently lost.',
  },
  {
    title: 'It checks itself against reality',
    body:
      'What was commanded, what the Hub reported, and what the meter measured all have to agree. When they do not, that is the fault report — not a guess.',
  },
];

/*
 * Recomputed from the bench sheet on 22 Aug 2026, using every reading rather
 * than a subset.
 *
 * The previous figures here - "1.32% worst of five, 4.67% the sixth" - were
 * true only of a chosen five. Two loads were measured twice, and quoting 1.32%
 * required taking the second run for both while leaving out the first run's
 * laptop charger at 10.92%, which sits on the same sheet. Anyone shown the raw
 * data would have found it.
 *
 * The honest figures are barely weaker and cover all eight readings: six points
 * inside the 2.24% band, and the charger outside it on both attempts. Repeating
 * the outlier is what makes it a characterised behaviour rather than an
 * anomaly, so both numbers are quoted.
 */
const ACCURACY = [
  { figure: '8', unit: 'load points', detail: 'from 11.9 W to 121.8 W, over two runs' },
  { figure: '2.18%', unit: 'worst of six', detail: 'inside the 2.24% agreement band' },
  { figure: '10.92%', unit: 'and 4.67%', detail: 'one laptop charger at 0.47 power factor, both runs' },
];

export const LandingPage = () => (
  <div className={styles.page} id="top">
    <header className={styles.nav}>
      <div className={styles.navInner}>
        <a
          className={styles.brandLink}
          href="#top"
          aria-label="WattWise — back to top"
          onClick={(event) => {
            event.preventDefault();
            scrollToTop();
          }}
        >
          <span className={styles.brand}>
            <span className={styles.brandMark} aria-hidden="true">
              <BoltMark height={16} />
            </span>
            <Wordmark className={styles.brandName} />
          </span>
        </a>

        <nav className={styles.navLinks}>
          <a className={styles.navLink} href="#what">
            Features
          </a>
          <a className={styles.navLink} href="#cost">
            Estimator
          </a>
          <a className={styles.navLink} href="#how">
            How it works
          </a>
          <a className={styles.navLink} href="#faq">
            FAQ
          </a>
          <Link to="/login" className={styles.navSignIn}>
            Sign in
          </Link>
        </nav>
      </div>
    </header>

    <main>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Smart energy monitoring for two outlets</p>
          <h1 className={styles.heroTitle}>
            Know what every outlet costs you — and switch it off from anywhere.
          </h1>
          <p className={styles.heroLead}>
            WattWise measures each of your two outlets with its own meter, prices the energy
            against your real electricity tariff, and cuts the power when a load goes past a
            limit you set.
          </p>

          <div className={styles.ctaRow}>
            <a className={styles.ctaPrimary} href={ANDROID_APK_URL}>
              <span aria-hidden="true">⬇</span>
              Download for Android
            </a>
            <Link to="/login" className={styles.ctaSecondary}>
              Sign in on the web
            </Link>
          </div>

          <p className={styles.ctaNote}>
            Version {ANDROID_VERSION} · about {ANDROID_APK_SIZE_MB} MB · Android only. Your phone
            will ask you to allow installs from your browser — that prompt is expected for an app
            installed outside the Play Store.
          </p>
        </div>

        <div className={styles.heroFigure}>
          <PowerPreview />
        </div>
      </section>

      {/* Estimator */}
      <section className={styles.section} id="cost">
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>What does it actually cost to leave that on?</h2>
          <p className={styles.sectionLead}>
            This is the app&rsquo;s own billing module, running here in your browser. Change the
            watts and the hours and watch the tariff work.
          </p>
        </div>

        <div className={styles.card}>
          <CostEstimator />
        </div>
      </section>

      {/* Features */}
      <section className={styles.section} id="what">
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>What WattWise does</h2>
        </div>

        <ul className={styles.featureGrid}>
          {FEATURES.map((feature) => (
            <li key={feature.title} className={styles.feature}>
              <span className={styles.featureIcon} aria-hidden="true">
                {feature.icon}
              </span>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureBody}>{feature.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Safety */}
      <section className={styles.section} id="safety">
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Four stages, not an on/off switch</h2>
          <p className={styles.sectionLead}>
            A load does not go straight from fine to cut off. WattWise warns twice first, and the
            thresholds below are the ones the system really uses.
          </p>
        </div>

        <div className={styles.card}>
          <SafetyDemo />
        </div>
      </section>

      {/* How it works — genuinely ordered, so the numbering carries meaning. */}
      <section className={styles.section} id="how">
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>How it works</h2>
        </div>

        <ol className={styles.steps}>
          {STEPS.map((step, index) => (
            <li key={step.title} className={styles.step}>
              <span className={styles.stepNumber} aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepBody}>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Accuracy */}
      <section className={styles.section} id="accuracy">
        <div className={styles.accuracy}>
          <div className={styles.accuracyCopy}>
            <h2 className={styles.sectionTitle}>Checked against a reference meter</h2>
            <p className={styles.sectionLead}>
              Measurement was compared against a separate meter across eight readings. Six
              agreed inside the tolerance the two instruments share. The other two are one laptop
              charger, measured twice, and it is on this page for the same reason it is in the
              documentation: a poor power factor is exactly where a low-cost meter drifts, and
              hiding it would make the other six worth less.
            </p>
          </div>

          <ul className={styles.stats}>
            {ACCURACY.map((stat) => (
              <li key={stat.unit} className={styles.stat}>
                <span className={styles.statFigure}>{stat.figure}</span>
                <span className={styles.statUnit}>{stat.unit}</span>
                <span className={styles.statDetail}>{stat.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ — the Help Center's own answers, so the two cannot drift apart. */}
      <section className={styles.section} id="faq">
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Questions worth asking first</h2>
          <p className={styles.sectionLead}>
            These are taken from the app&rsquo;s Help Center word for word, including the parts
            that say what WattWise cannot do.
          </p>
        </div>

        <FaqSection />
      </section>

      {/* Download */}
      <section className={styles.section} id="download">
        <div className={styles.download}>
          <h2 className={styles.downloadTitle}>Get the app</h2>
          <p className={styles.downloadLead}>
            An account is created in the Android app, because that is where a Hub is paired to it.
            Once you have one, this website signs in with the same account and shows the same data.
          </p>

          <div className={styles.ctaRow}>
            <a className={styles.ctaPrimary} href={ANDROID_APK_URL}>
              <span aria-hidden="true">⬇</span>
              Download v{ANDROID_VERSION} for Android
            </a>
            <a
              className={styles.ctaSecondary}
              href={RELEASES_URL}
              target="_blank"
              rel="noreferrer noopener"
            >
              All releases &amp; changelog
            </a>
          </div>

          <p className={styles.downloadNote}>
            Everything except live readings works without a Hub — you can sign in, look around and
            see how the app is laid out before any hardware exists.
          </p>

          {/* Reported twice from a phone on mobile data: the transfer stalls near
              the end and a second attempt completes. Every download link on this
              page is the same markup pointing at the same asset, so there is
              nothing here to fix — what was missing was telling people that a
              stall is resumable rather than leaving them to guess whether a
              60 MB download had failed. */}
          <p className={styles.downloadNote}>
            It is a {ANDROID_APK_SIZE_MB} MB file. If the download stalls part-way on mobile data,
            open your browser&apos;s Downloads and tap resume — it picks up where it stopped rather
            than starting again. Wi-Fi is easier on it.
          </p>
        </div>
      </section>
    </main>

    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <span className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            <BoltMark height={14} />
          </span>
          <Wordmark className={styles.brandName} />
        </span>

        <nav className={styles.footerLinks}>
          <Link to="/login">Sign in</Link>
          <a href={ANDROID_APK_URL}>Download</a>
          <a href={REPO_URL} target="_blank" rel="noreferrer noopener">
            Source
          </a>
        </nav>

        <p className={styles.footerNote}>
          An undergraduate capstone project. Built for low-voltage household appliances only.
        </p>
      </div>
    </footer>

    <BackToTop />
  </div>
);

export default LandingPage;
