// "Book together" card (ui.md, R-13 to R-17): group size, the shared finder, one assignment
// row per found seat, then "Book N seats" / "Clear".
import { useState } from 'react';
import { TEAM_MAX, TEAM_MIN } from '@seat/shared';
import { useReadOnly } from '../hooks';
import { useStore } from '../store';
import { PersonSearch } from './PersonSearch';

export function BookTogether() {
  const team = useStore((s) => s.team);
  const teamAssign = useStore((s) => s.teamAssign);
  const findTeam = useStore((s) => s.findTeam);
  const assign = useStore((s) => s.assign);
  const clearTeam = useStore((s) => s.clearTeam);
  const bookTeam = useStore((s) => s.bookTeam);
  const ro = useReadOnly();
  const [size, setSize] = useState('4');

  return (
    <div className="card" data-testid="book-together">
      <h3>Book together</h3>
      <p className="hint">
        Find free seats next to each other for your team, then name who sits where.
      </p>
      <div className="row">
        <label htmlFor="teamSize" className="muted">
          People
        </label>
        <input
          id="teamSize"
          className="num"
          type="number"
          min={TEAM_MIN}
          max={TEAM_MAX}
          value={size}
          onChange={(e) => setSize(e.target.value)}
        />
        <button type="button" className="btn" onClick={() => findTeam(Number.parseInt(size, 10))}>
          Find seats together
        </button>
      </div>
      {team.length > 0 && (
        <>
          <p className="hint">
            Selected on the map. Name each person, or leave it as a seat held for your team.
          </p>
          <div className="assign">
            {team.map((seat, i) => (
              <div className="a" key={seat}>
                <label className="mono" htmlFor={`as-${seat}`}>
                  {seat}
                </label>
                <PersonSearch
                  inputId={`as-${seat}`}
                  placeholder={i === 0 ? 'You' : 'Search a colleague…'}
                  value={teamAssign[seat]}
                  onChange={(a) => assign(seat, a)}
                />
              </div>
            ))}
          </div>
          <div className="btns">
            <button
              type="button"
              className="btn primary"
              disabled={ro}
              onClick={() => void bookTeam()}
            >
              Book {team.length} seats
            </button>
            <button type="button" className="btn" onClick={clearTeam}>
              Clear
            </button>
          </div>
        </>
      )}
    </div>
  );
}
