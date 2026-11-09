import React, { useEffect, useRef, useState } from 'react';

interface InlineTextProps {
  value: string;
  onCommit: (next: string) => string | null | void;
  title?: string;
  className?: string;
}

/** Text that turns into an input on single click (or pencil). Enter/blur saves, Esc cancels. */
export const InlineText: React.FC<InlineTextProps> = ({
  value,
  onCommit,
  title = 'Click to edit',
  className = ''
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const skipBlur = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const start = (e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    setDraft(value);
    setError(null);
    setNotice(null);
    skipBlur.current = false;
    setEditing(true);
  };

  const cancel = () => {
    skipBlur.current = true;
    setEditing(false);
    setError(null);
  };

  const commit = (fromBlur: boolean) => {
    const next = draft.replace(/[\r\n]+/g, ' ').trim();
    if (!next || next === value) {
      cancel();
      return;
    }
    const err = onCommit(next);
    if (err) {
      if (fromBlur) {
        cancel();
        setNotice(err);
      } else {
        setError(err);
      }
      return;
    }
    skipBlur.current = true;
    setEditing(false);
    setError(null);
  };

  if (editing) {
    return (
      <span className="inline-edit-wrap" onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          className={`inline-edit-input ${error ? 'has-error' : ''}`}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit(false);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              cancel();
            }
          }}
          onBlur={() => {
            if (skipBlur.current) {
              skipBlur.current = false;
              return;
            }
            commit(true);
          }}
        />
        {error && <span className="inline-edit-error">{error}</span>}
      </span>
    );
  }

  return (
    <span className="inline-edit-wrap">
      <span
        className={`inline-edit-text ${className}`.trim()}
        onClick={start}
        title={title}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            start(e);
          }
        }}
      >
        {value}
      </span>
      <button type="button" className="inline-edit-btn" onClick={start} title="Rename" aria-label={`Rename ${value}`}>
        ✎
      </button>
      {notice && <span className="inline-edit-error">{notice}</span>}
    </span>
  );
};

interface InlineColorProps {
  color: string;
  onCommit: (color: string) => void;
  title?: string;
}

export const InlineColor: React.FC<InlineColorProps> = ({ color, onCommit, title = 'Change colour' }) => {
  const [preview, setPreview] = useState(color);
  const ref = useRef<HTMLInputElement>(null);
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;
  const latest = useRef(color);

  useEffect(() => {
    setPreview(color);
    latest.current = color;
  }, [color]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onChange = () => {
      if (el.value !== latest.current) commitRef.current(el.value);
    };
    el.addEventListener('change', onChange);
    return () => el.removeEventListener('change', onChange);
  }, []);

  return (
    <label className="inline-color" title={title} onClick={e => e.stopPropagation()}>
      <span className="sheet-dot" style={{ background: preview }} />
      <input ref={ref} type="color" value={preview} aria-label={title} onChange={e => setPreview(e.target.value)} />
    </label>
  );
};

export function rekey<T>(rec: Record<string, T>, from: string, to: string): Record<string, T> {
  if (!(from in rec)) return rec;
  const { [from]: val, ...rest } = rec;
  return { ...rest, [to]: val };
}
