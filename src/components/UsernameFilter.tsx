import { useState, useRef, useEffect } from "react";

interface Props {
  usernames: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export default function UsernameFilter({ usernames, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (usernames.length <= 1) return null;

  const allSelected = selected.length === usernames.length;

  return (
    <div className="cat-filter" ref={ref}>
      <button className="cat-filter-trigger" onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
        Username
        {!allSelected && <span className="cat-filter-count">{selected.length}</span>}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="cat-filter-dropdown" onClick={(e) => e.stopPropagation()}>
          <div className="cat-filter-list">
            <label className="cat-filter-option">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => onChange(allSelected ? [] : [...usernames])}
              />
              <span>All ({usernames.length})</span>
            </label>
            {usernames.map(name => (
              <label key={name} className="cat-filter-option">
                <input
                  type="checkbox"
                  checked={selected.includes(name)}
                  onChange={() => {
                    if (selected.includes(name)) {
                      onChange(selected.filter(n => n !== name));
                    } else {
                      onChange([...selected, name]);
                    }
                  }}
                />
                <span>{name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
