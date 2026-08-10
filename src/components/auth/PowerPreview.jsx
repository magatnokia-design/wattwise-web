import { useState } from 'react';
import styles from './PowerPreview.module.css';

/**
 * Interactive illustration for the sign-in page.
 *
 * Deliberately abstract: no wattage, no kWh, no peso figures. The app's rule is
 * that no number is ever invented, so this shows the *shape* of the product —
 * a hub feeding two outlets, and the toggle that is the whole interaction —
 * without pretending to be a reading. Real figures appear after sign-in or not
 * at all.
 */
const OUTLETS = [
  {
    id: 1,
    label: 'Outlet 1',
    cx: 72,
    cy: 170,
    wire: 'M160 62 C 160 120, 72 112, 72 144',
  },
  {
    id: 2,
    label: 'Outlet 2',
    cx: 248,
    cy: 170,
    wire: 'M160 62 C 160 120, 248 112, 248 144',
  },
];

export const PowerPreview = () => {
  const [live, setLive] = useState({ 1: true, 2: false });

  const toggle = (id) => setLive((current) => ({ ...current, [id]: !current[id] }));

  const onKeyDown = (event, id) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle(id);
    }
  };

  const anyLive = live[1] || live[2];

  return (
    <figure className={styles.figure}>
      <svg
        viewBox="0 0 320 232"
        className={styles.svg}
        role="group"
        aria-label="Interactive diagram of a hub feeding two outlets"
      >
        <defs>
          <linearGradient id="ww-wire" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#047857" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>

        {/* Hub */}
        <g className={`${styles.hub} ${anyLive ? styles.hubLive : ''}`}>
          <rect x="126" y="14" width="68" height="48" rx="14" className={styles.hubBody} />
          <path
            d="M163 28 L153 44 h7 l-3 12 l10 -16 h-7 z"
            className={styles.hubBolt}
          />
        </g>

        {OUTLETS.map((outlet) => {
          const isLive = live[outlet.id];

          return (
            <g key={outlet.id}>
              <path d={outlet.wire} className={styles.wireTrack} />
              <path
                d={outlet.wire}
                className={`${styles.wireLive} ${isLive ? styles.wireOn : ''}`}
                stroke="url(#ww-wire)"
              />

              <g
                role="button"
                tabIndex={0}
                aria-pressed={isLive}
                aria-label={`${outlet.label}: ${isLive ? 'on' : 'off'}`}
                className={styles.node}
                onClick={() => toggle(outlet.id)}
                onKeyDown={(event) => onKeyDown(event, outlet.id)}
              >
                <circle
                  cx={outlet.cx}
                  cy={outlet.cy}
                  r="30"
                  className={`${styles.halo} ${isLive ? styles.haloOn : ''}`}
                />
                <circle
                  cx={outlet.cx}
                  cy={outlet.cy}
                  r="26"
                  className={`${styles.socket} ${isLive ? styles.socketOn : ''}`}
                />
                <rect
                  x={outlet.cx - 9}
                  y={outlet.cy - 9}
                  width="5"
                  height="13"
                  rx="2.5"
                  className={`${styles.prong} ${isLive ? styles.prongOn : ''}`}
                />
                <rect
                  x={outlet.cx + 4}
                  y={outlet.cy - 9}
                  width="5"
                  height="13"
                  rx="2.5"
                  className={`${styles.prong} ${isLive ? styles.prongOn : ''}`}
                />
                <circle
                  cx={outlet.cx}
                  cy={outlet.cy + 11}
                  r="2.5"
                  className={`${styles.prong} ${isLive ? styles.prongOn : ''}`}
                />
              </g>

              <text
                x={outlet.cx}
                y={outlet.cy + 50}
                textAnchor="middle"
                className={styles.nodeLabel}
              >
                {outlet.label}
              </text>
              <text
                x={outlet.cx}
                y={outlet.cy + 66}
                textAnchor="middle"
                className={`${styles.nodeState} ${isLive ? styles.nodeStateOn : ''}`}
              >
                {isLive ? 'ON' : 'OFF'}
              </text>
            </g>
          );
        })}
      </svg>

      <figcaption className={styles.caption}>
        <span className={styles.captionDot} aria-hidden="true" />
        Try the switches — this is the control, not live data.
      </figcaption>
    </figure>
  );
};

export default PowerPreview;
