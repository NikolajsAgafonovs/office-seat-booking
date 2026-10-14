// Settings strip "Open questions, as switches" (ui.md Layout 4, decisions/README.md): one
// segmented control per OPEN decision. Hidden entirely once none is open. Values persist per
// browser via the store (domain-model.md "Per-user settings").
import type { Settings } from '@seat/shared';
import { useStore } from '../store';

interface Switch<K extends keyof Settings = keyof Settings> {
  record: string;
  oid: string;
  key: K;
  title: string;
  note: string;
  options: ReadonlyArray<[Settings[K], string]>;
}

/** Decisions 0001, 0002, 0003 are open on 2026-10-14; remove an entry when one is decided. */
const SWITCHES: ReadonlyArray<Switch<'slotSize'> | Switch<'dedRule'> | Switch<'area'>> = [
  {
    record: '0001',
    oid: 'O-1',
    key: 'slotSize',
    title: 'Booking slot size',
    note: 'Tolga proposed 4-hour blocks; hourly is the third option and not shown here.',
    options: [
      ['day', 'Full days only'],
      ['half', 'Half days'],
    ],
  },
  {
    record: '0002',
    oid: 'O-2',
    key: 'dedRule',
    title: "Dedicated seat on owner's day off",
    note: 'Who assigns dedicated seats is also open (O-7); here, admins can.',
    options: [
      ['release', 'Owner can release it'],
      ['locked', 'Always reserved'],
    ],
  },
  {
    record: '0003',
    oid: 'O-12',
    key: 'area',
    title: 'Bookable part of the floor',
    note: 'The September slide writes “VISMA” east of the red line. Not confirmed.',
    options: [
      ['east', 'East (≈ 92)'],
      ['all', 'Whole floor (≈ 168)'],
    ],
  },
];

export function SettingsStrip() {
  const settings = useStore((s) => s.settings);
  const setSetting = useStore((s) => s.setSetting);
  if (SWITCHES.length === 0) return null;
  return (
    <section className="settings" aria-labelledby="setTitle" data-testid="settings">
      <h2 id="setTitle">Open questions, as switches</h2>
      <p className="hint">
        These are undecided in the spec. Flip them to see how each answer would change the app. They
        change this page only, for you.
      </p>
      <div className="setgrid">
        {SWITCHES.map((sw) => (
          <div className="setting" key={sw.record}>
            <span className="label" id={`set-${sw.key}`}>
              {sw.title} <span className="oid">{sw.oid}</span>
            </span>
            <div className="seg" role="group" aria-labelledby={`set-${sw.key}`}>
              {sw.options.map(([value, text]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={settings[sw.key] === value}
                  onClick={() => setSetting(sw.key, value)}
                >
                  {text}
                </button>
              ))}
            </div>
            <p>{sw.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
