import { useCallback, useEffect, useRef, useState } from 'react';
import { pointerState } from '../input/InputManager.js';

/**
 * Post-its de tarefas diárias — quadro na lateral direita, ao lado da
 * cortina. Cada nota tem fita adesiva no topo, título, descrição, status
 * (pendente / em andamento / concluído — concluído ganha borda brilhante)
 * e cor. Arraste com o mouse, ou com a mão pela câmera: mão aberta pega
 * e move, mão fechada solta no lugar, "tchau" sobre a nota apaga.
 * Persistidas no navegador (localStorage).
 */

const STORAGE_KEY = 'tilim-postits';
const DONE_KEY = 'tilim-done-today';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function loadDoneToday() {
  try {
    const v = JSON.parse(localStorage.getItem(DONE_KEY));
    return v && v.date === today() ? v : { date: today(), count: 0 };
  } catch {
    return { date: today(), count: 0 };
  }
}

const COLORS = [
  { id: 'amarelo', bg: '#f6e27f' },
  { id: 'rosa', bg: '#f5bcc6' },
  { id: 'azul', bg: '#aed9e8' },
  { id: 'verde', bg: '#bfe0b2' },
  { id: 'lilas', bg: '#d9c6ef' },
];

// ícones de status — mesmo sistema visual do painel (outline, viewBox 24)
function StatusSvg({ children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
const PendingIcon = () => (
  <StatusSvg>
    <circle cx="12" cy="12" r="8" />
  </StatusSvg>
);
const DoingIcon = () => (
  <StatusSvg>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none" />
  </StatusSvg>
);
const DoneIcon = () => (
  <StatusSvg>
    <circle cx="12" cy="12" r="8" />
    <path d="M8.5 12.2l2.4 2.4 4.6-5" />
  </StatusSvg>
);

const STATUS = [
  { id: 'pending', label: 'pendente', Icon: PendingIcon },
  { id: 'doing', label: 'em andamento', Icon: DoingIcon },
  { id: 'done', label: 'concluído', Icon: DoneIcon },
];

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

let uid = Date.now();

export function PostItsLayer() {
  const [notes, setNotes] = useState(load);
  const [editing, setEditing] = useState(null); // id em edição
  const layerRef = useRef(null);
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const heldByHandRef = useRef(null);
  const lastWaveHandled = useRef(0);
  const [handHeld, setHandHeld] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  const addNote = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const boardX = w >= 900 ? w * 0.62 : w * 0.1;
    const note = {
      id: `n${uid++}`,
      title: '',
      desc: '',
      status: 'pending',
      color: COLORS[Math.floor(Math.random() * COLORS.length)].id,
      x: boardX + Math.random() * (w * 0.3 - 190),
      y: h * 0.18 + Math.random() * h * 0.45,
      rot: (Math.random() - 0.5) * 5,
    };
    setNotes((ns) => [...ns, note]);
    setEditing(note.id);
  }, []);

  const [doneToday, setDoneToday] = useState(loadDoneToday);
  useEffect(() => {
    localStorage.setItem(DONE_KEY, JSON.stringify(doneToday));
  }, [doneToday]);

  const patch = useCallback((id, changes) => {
    setNotes((ns) =>
      ns.map((n) => {
        if (n.id !== id) return n;
        // contador do dia: transição para concluído
        if (changes.status === 'done' && n.status !== 'done') {
          setDoneToday((d) =>
            d.date === today()
              ? { ...d, count: d.count + 1 }
              : { date: today(), count: 1 }
          );
        }
        return { ...n, ...changes };
      })
    );
  }, []);

  const remove = useCallback((id) => {
    setNotes((ns) => ns.filter((n) => n.id !== id));
    setEditing((e) => (e === id ? null : e));
  }, []);

  // ----- arrastar com o mouse/toque -----
  const dragRef = useRef(null);
  const onNoteDown = (e, id) => {
    if (e.target.closest('input, textarea, button, select')) return;
    const note = notesRef.current.find((n) => n.id === id);
    dragRef.current = {
      id,
      offX: e.clientX - note.x,
      offY: e.clientY - note.y,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current;
      if (!d) return;
      patch(d.id, {
        x: Math.max(4, Math.min(window.innerWidth - 180, e.clientX - d.offX)),
        y: Math.max(60, Math.min(window.innerHeight - 120, e.clientY - d.offY)),
      });
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [patch]);

  // ----- gestos de mão (câmera) -----
  useEffect(() => {
    let raf;
    const noteAt = (x, y) => {
      const els = layerRef.current?.querySelectorAll('.postit') ?? [];
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (x > r.left - 14 && x < r.right + 14 && y > r.top - 14 && y < r.bottom + 14) {
          return el.dataset.id;
        }
      }
      return null;
    };

    const step = () => {
      raf = requestAnimationFrame(step);
      const p = pointerState;
      if (p.source !== 'hand' || !p.handPresent) {
        if (heldByHandRef.current) {
          heldByHandRef.current = null;
          setHandHeld(null);
        }
        return;
      }

      // "tchau" apaga a nota sob a mão (uma vez por gesto)
      if (p.waveAt && p.waveAt !== lastWaveHandled.current && performance.now() - p.waveAt < 300) {
        const target = heldByHandRef.current ?? noteAt(p.x, p.y);
        if (target) {
          lastWaveHandled.current = p.waveAt;
          heldByHandRef.current = null;
          setHandHeld(null);
          remove(target);
          return;
        }
      }

      const held = heldByHandRef.current;
      if (!held) {
        // mão aberta sobre uma nota → pega
        if (p.handPose === 'open') {
          const id = noteAt(p.x, p.y);
          if (id) {
            heldByHandRef.current = id;
            setHandHeld(id);
          }
        }
      } else if (p.handPose === 'fist') {
        // mão fechada → solta e fica onde está
        heldByHandRef.current = null;
        setHandHeld(null);
      } else {
        // segue a mão
        patch(held, {
          x: Math.max(4, Math.min(window.innerWidth - 180, p.x - 80)),
          y: Math.max(60, Math.min(window.innerHeight - 120, p.y - 40)),
        });
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [patch, remove]);

  return (
    <div className="postits-layer" ref={layerRef} data-ui="true">
      <button type="button" className="add-note-btn" onClick={addNote}>
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 4h16v10l-6 6H4V4z" />
          <path d="M20 14h-6v6" />
          <path d="M9 9h6M9 12.5h4" strokeWidth="1.3" />
        </svg>
        nova nota
      </button>
      {doneToday.count > 0 && (
        <span className="done-counter" title="Notas concluídas hoje">
          ✓ {doneToday.count} hoje
        </span>
      )}

      {notes.map((n) => {
        const color = COLORS.find((c) => c.id === n.color) ?? COLORS[0];
        const isEditing = editing === n.id;
        return (
          <div
            key={n.id}
            data-id={n.id}
            className={`postit status-${n.status} ${handHeld === n.id ? 'is-held' : ''}`}
            style={{
              left: n.x,
              top: n.y,
              background: color.bg,
              '--rot': `${n.rot}deg`,
            }}
            onPointerDown={(e) => onNoteDown(e, n.id)}
            onDoubleClick={() => setEditing(n.id)}
          >
            <span className="tape" aria-hidden="true" />
            <button
              type="button"
              className="note-del"
              aria-label="Apagar nota"
              onClick={() => remove(n.id)}
            >
              ×
            </button>

            {isEditing ? (
              <>
                <input
                  className="note-title"
                  placeholder="título"
                  value={n.title}
                  autoFocus
                  maxLength={40}
                  onChange={(e) => patch(n.id, { title: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && setEditing(null)}
                />
                <textarea
                  className="note-desc"
                  placeholder="descrição…"
                  value={n.desc}
                  rows={3}
                  maxLength={160}
                  onChange={(e) => patch(n.id, { desc: e.target.value })}
                />
                <div className="note-colors">
                  {COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`note-color ${n.color === c.id ? 'is-active' : ''}`}
                      style={{ background: c.bg }}
                      onClick={() => patch(n.id, { color: c.id })}
                      aria-label={`Cor ${c.id}`}
                    />
                  ))}
                </div>
                <button type="button" className="note-ok" onClick={() => setEditing(null)}>
                  pronto
                </button>
              </>
            ) : (
              <div className="note-body" onClick={() => !n.title && setEditing(n.id)}>
                <p className="note-title-view">{n.title || 'toque 2× pra editar'}</p>
                {n.desc && <p className="note-desc-view">{n.desc}</p>}
              </div>
            )}

            <div className="note-status" role="group" aria-label="Status">
              {STATUS.map(({ id, label, Icon: StatusIcon }) => (
                <button
                  key={id}
                  type="button"
                  className={`status-chip status-${id} ${n.status === id ? 'is-active' : ''}`}
                  onClick={() => patch(n.id, { status: id })}
                  aria-label={label}
                  title={label}
                >
                  <StatusIcon />
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
