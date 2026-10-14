// Occupancy stats in the map header (R-5): "N free · N taken · N dedicated · N bookable".
import { useDerived } from '../hooks';

export function Stats() {
  const { counts } = useDerived();
  const items: Array<[string, number]> = [
    ['free', counts.free],
    ['taken', counts.taken],
    ['dedicated', counts.dedicated],
    ['bookable', counts.bookable],
  ];
  return (
    <div className="stats" data-testid="stats">
      {items.map(([k, v]) => (
        <span key={k} data-testid={`stat-${k}`}>
          <b>{v}</b> {k}
        </span>
      ))}
    </div>
  );
}
