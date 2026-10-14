// Directory search input (R-15, R-24, ui.md "Book together"): typing after the first
// character queries GET /api/users and shows up to 6 results with avatars; picking one
// assigns that colleague, any other text stays as a free-text label.
import { useEffect, useRef, useState } from 'react';
import type { UserProfile } from '@seat/shared';
import { api } from '../api';
import { useStore } from '../store';
import type { Assignment } from '../store';

const MAX_RESULTS = 6;
const DEBOUNCE_MS = 150;

interface Props {
  inputId: string;
  placeholder: string;
  value: Assignment | undefined;
  onChange: (a: Assignment | undefined) => void;
  /** When false, typed text is not kept as a label (used for picking a dedication owner). */
  allowLabel?: boolean;
  autoFocus?: boolean;
}

export function PersonSearch({
  inputId,
  placeholder,
  value,
  onChange,
  allowLabel = true,
  autoFocus,
}: Props) {
  const profiles = useStore((s) => s.profiles);
  const cacheProfile = useStore((s) => s.cacheProfile);
  const [text, setText] = useState(() =>
    value?.kind === 'user' ? (profiles[value.id]?.name ?? '') : (value?.label ?? ''),
  );
  const [hits, setHits] = useState<UserProfile[]>([]);
  const [open, setOpen] = useState(false);
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const search = (q: string) => {
    if (timer.current) clearTimeout(timer.current);
    seq.current += 1;
    const n = seq.current;
    timer.current = setTimeout(async () => {
      try {
        const res = await api.searchUsers(q);
        if (seq.current !== n) return;
        setHits(res.slice(0, MAX_RESULTS));
        setOpen(res.length > 0);
      } catch {
        setHits([]);
        setOpen(false);
      }
    }, DEBOUNCE_MS);
  };

  const onInput = (v: string) => {
    setText(v);
    const q = v.trim();
    onChange(q && allowLabel ? { kind: 'label', label: q } : undefined);
    if (!q) {
      seq.current += 1;
      setHits([]);
      setOpen(false);
      return;
    }
    search(q);
  };

  const pick = (p: UserProfile) => {
    cacheProfile(p);
    onChange({ kind: 'user', id: p.id });
    setText(p.name);
    setHits([]);
    setOpen(false);
  };

  const listId = `${inputId}-list`;
  return (
    <div className="search">
      <input
        id={inputId}
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        autoFocus={autoFocus}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={(e) => onInput(e.target.value)}
        onFocus={() => {
          if (hits.length) setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
      />
      {open && (
        <ul className="picker" id={listId} role="listbox">
          {hits.map((h) => (
            <li
              key={h.id}
              role="option"
              aria-selected={value?.kind === 'user' && value.id === h.id}
            >
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(h)}>
                <img src={h.avatarUrl} alt="" />
                <span>{h.isMe ? `${h.name} (you)` : h.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
