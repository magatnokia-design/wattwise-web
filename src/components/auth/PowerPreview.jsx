import { useState } from 'react';
import styles from './PowerPreview.module.css';

/**
 * Interactive illustration for the sign-in page.
 *
 * Laid out horizontally — hub above, two outlets side by side — so it costs
 * about 100px of height instead of the 240px the earlier vertical version took.
 * The sign-in panel has to fit one viewport without scrolling.
 *
 * Deliberately abstract: no wattage, no kWh, no peso figures. The app's rule is
 * that no number is ever invented, so this shows the *shape* of the product and
 * the toggle that is the whole interaction, without pretending to be a reading.
 */
const OUTLETS = [
  { id: 1, label: 'Outlet 1', cx: 100, wire: 'M150 36 C 150 44, 100 38, 100 45' },
  { id: 2, label: 'Outlet 2', cx: 200, wire: 'M150 36 C 150 44, 200 38, 200 45' },
];

const NODE_CY = 68;

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
        viewBox="0 0 300 124"
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

        <g className={`${styles.hub} ${anyLive ? styles.hubLive : ''}`}>
          <rect x="126" y="4" width="48" height="32" rx="10" className={styles.hubBody} />
          <path d="M152 12 L144 24 h5 l-2 9 l8 -13 h-5 z" className={styles.hubBolt} />
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
                  cy={NODE_CY}
                  r="26"
                  className={`${styles.halo} ${isLive ? styles.haloOn : ''}`}
                />
                <circle
                  cx={outlet.cx}
                  cy={NODE_CY}
                  r="22"
                  className={`${styles.socket} ${isLive ? styles.socketOn : ''}`}
                />
                <rect
                  x={outlet.cx - 8}
                  y={NODE_CY - 8}
                  width="4.5"
                  height="11"
                  rx="2.25"
                  className={`${styles.prong} ${isLive ? styles.prongOn : ''}`}
                />
                <rect
                  x={outlet.cx + 3.5}
                  y={NODE_CY - 8}
                  width="4.5"
                  height="11"
                  rx="2.25"
                  className={`${styles.prong} ${isLive ? styles.prongOn : ''}`}
                />
                <circle
                  cx={outlet.cx}
                  cy={NODE_CY + 9}
                  r="2.2"
                  className={`${styles.prong} ${isLive ? styles.prongOn : ''}`}
                />
              </g>

              <text x={outlet.cx} y="106" textAnchor="middle" className={styles.nodeLabel}>
                {outlet.label}
              </text>
              <text
                x={outlet.cx}
                y="119"
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
