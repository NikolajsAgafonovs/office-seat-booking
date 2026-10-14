// Legend under the map (R-3): one swatch per seat look from ui.md "Map".
const ITEMS: Array<[string, string]> = [
  ['sw-free', 'Free'],
  ['sw-mine', 'Yours'],
  ['sw-taken', 'Taken'],
  ['sw-partial', 'Half taken'],
  ['sw-ded', 'Dedicated'],
  ['sw-sel', 'Selected'],
  ['sw-off', 'Not bookable in this setting'],
];

export function Legend() {
  return (
    <div className="legend" aria-label="Legend">
      {ITEMS.map(([cls, text]) => (
        <span key={cls}>
          <i className={`sw ${cls}`} aria-hidden="true" />
          {text}
        </span>
      ))}
    </div>
  );
}
