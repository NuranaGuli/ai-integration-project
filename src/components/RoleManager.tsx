"use client";

import {
  useCallback, useEffect, useRef, useState,
} from "react";
import type { UserRole } from "@/app/types/chat";
import {
  addBannedWord,
  removeBannedWord,
  getDynamicBannedWords,
} from "@/utils/contentFilter";


const ROLE_LS_KEY = "duolingo_user_role_v1";

const ROLE_META: Record<UserRole, {
  label: string; color: string; bg: string;
  border: string; description: string; emoji: string;
}> = {
  student:   { label: "Student",   emoji: "🎓", color: "#14532d", bg: "#f0fdf4", border: "#86efac", description: "Attends the class" },
  teacher:   { label: "Teacher",   emoji: "📚", color: "#1e3a8a", bg: "#eff6ff", border: "#93c5fd", description: "Manages the class"   },
  moderator: { label: "Moderator", emoji: "🛡️", color: "#7c2d12", bg: "#fff7ed", border: "#fdba74", description: "Manages the word list" },
};

const ALL_ROLES: UserRole[] = ["student", "teacher", "moderator"];


interface AdminPanelState {
  words: string[];
  loading: boolean;
  error: string | null;
  success: string | null;
}


export function RoleManager() {
  const [role,   setRole]   = useState<UserRole>("student");
  const [isOpen, setIsOpen] = useState(false);
  const [dropPos, setDropPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ROLE_LS_KEY) as UserRole | null;
      if (saved && saved in ROLE_META) setRole(saved);
    } catch {}
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      const panel = document.getElementById("role-dropdown-panel");
      if (panel && !panel.contains(target) && !btnRef.current?.contains(target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  function toggleOpen() {
    if (!isOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropPos({
        top:   rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setIsOpen((v) => !v);
  }

  function switchRole(newRole: UserRole) {
    setRole(newRole);
    try { localStorage.setItem(ROLE_LS_KEY, newRole); } catch { /* ignore */ }
  }

  const meta = ROLE_META[role];

  return (
    <>
      {}
      <button
        ref={btnRef}
        type="button"
        onClick={toggleOpen}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Cari rol: ${meta.label}. Click to edit`}
        style={{
          display:      "flex",
          alignItems:   "center",
          gap:          "6px",
          padding:      "5px 12px 5px 8px",
          borderRadius: "999px",
          border:       `1.5px solid ${meta.border}`,
          background:   meta.bg,
          color:        meta.color,
          fontSize:     "12px",
          fontWeight:   700,
          cursor:       "pointer",
          whiteSpace:   "nowrap",
          transition:   "box-shadow 0.15s",
          boxShadow:    isOpen ? `0 0 0 3px ${meta.border}` : "none",
        }}
      >
        <span style={{ fontSize: "15px", lineHeight: 1 }}>{meta.emoji}</span>
        {meta.label}
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill={meta.color}
          style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}
          aria-hidden="true"
        >
          <path d="M5 7L1 3h8z" />
        </svg>
      </button>

      {}
      {isOpen && dropPos && (
        <div
          id="role-dropdown-panel"
          role="dialog"
          aria-label="Role Management"
          style={{
            position:     "fixed",
            top:          dropPos.top,
            right:        dropPos.right,
            width:        "300px",
            maxHeight:    "80vh",
            overflowY:    "auto",
            background:   "#ffffff",
            border:       "1px solid #e2e8f0",
            borderRadius: "16px",
            boxShadow:    "0 12px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
            zIndex:       9999,
          }}
        >
          {}
          <div style={{
            display:       "flex",
            justifyContent:"space-between",
            alignItems:    "center",
            padding:       "12px 16px",
            background:    "#f8fafc",
            borderBottom:  "1px solid #e2e8f0",
            borderRadius:  "16px 16px 0 0",
          }}>
            <span style={{ fontWeight: 700, fontSize: "13px", color: "#1e293b" }}>
              Choose a role
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Bağla"
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: "16px", color: "#64748b", lineHeight: 1, padding: "2px 4px",
              }}
            >
              ✕
            </button>
          </div>

          {}
          <div style={{ padding: "8px" }}>
            {ALL_ROLES.map((r) => {
              const m       = ROLE_META[r];
              const selected = r === role;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => { switchRole(r); }}
                  aria-pressed={selected}
                  style={{
                    display:      "flex",
                    alignItems:   "center",
                    gap:          "12px",
                    width:        "100%",
                    padding:      "10px 12px",
                    borderRadius: "10px",
                    border:       selected ? `2px solid ${m.border}` : "2px solid transparent",
                    background:   selected ? m.bg : "transparent",
                    cursor:       "pointer",
                    textAlign:    "left",
                    marginBottom: "3px",
                  }}
                >
                  <span style={{ fontSize: "22px", lineHeight: 1, flexShrink: 0 }}>{m.emoji}</span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: "block", fontWeight: 700, fontSize: "13px", color: m.color }}>
                      {m.label}
                    </span>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>{m.description}</span>
                  </span>
                  {selected && (
                    <span style={{ color: m.color, fontWeight: 700 }} aria-hidden="true">✓</span>
                  )}
                </button>
              );
            })}
          </div>

          {}
          {(role === "moderator" || role === "teacher") && (
            <>
              <div style={{ height: "1px", background: "#e2e8f0", margin: "0 8px" }} />
              <AdminWordPanel role={role} />
            </>
          )}
        </div>
      )}
    </>
  );
}


function AdminWordPanel({ role }: { role: UserRole }) {
  const [state, setState] = useState<AdminPanelState>({
    words:   getDynamicBannedWords(),
    loading: false,
    error:   null,
    success: null,
  });
  const [newWord, setNewWord] = useState("");

  useEffect(() => {
    if (!state.error && !state.success) return;
    const t = setTimeout(() => setState((s) => ({ ...s, error: null, success: null })), 3000);
    return () => clearTimeout(t);
  }, [state.error, state.success]);

  const handleAdd = useCallback(async () => {
    const word = newWord.trim().toLowerCase();
    if (word.length < 2) {
      setState((s) => ({ ...s, error: "Must be at least 2 characters long." }));
      return;
    }
    if (state.words.includes(word)) {
      setState((s) => ({ ...s, error: `"${word}" is already on the list.` }));
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null, success: null }));
    try {
      const res  = await fetch("/api/admin/words", {
        method:  "POST",
        headers: { "Content-Type": "application/json", "x-user-role": role },
        body:    JSON.stringify({ word }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setState((s) => ({ ...s, loading: false, error: String(data.error ?? "Error") }));
        return;
      }
      addBannedWord(word);
      setNewWord("");
      setState((s) => ({ ...s, loading: false, words: getDynamicBannedWords(), success: `"${word}" əlavə edildi.` }));
    } catch {
      setState((s) => ({ ...s, loading: false, error: "Failed to connect to the server." }));
    }
  }, [newWord, role, state.words]);

  const handleRemove = useCallback(async (word: string) => {
    setState((s) => ({ ...s, loading: true, error: null, success: null }));
    try {
      const res  = await fetch("/api/admin/words", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json", "x-user-role": role },
        body:    JSON.stringify({ word }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setState((s) => ({ ...s, loading: false, error: String(data.error ?? "Error") }));
        return;
      }
      removeBannedWord(word);
      setState((s) => ({ ...s, loading: false, words: getDynamicBannedWords(), success: `"${word}" silindi.` }));
    } catch {
      setState((s) => ({ ...s, loading: false, error: "Failed to connect to the server." }));
    }
  }, [role]);

  return (
    <div style={{ padding: "12px 16px 16px" }}>
      <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: "12px", color: "#7c2d12" }}>
        🚫 Banned Word Management
      </p>

      {(state.error ?? state.success) && (
        <div style={{
          padding: "7px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: 600,
          marginBottom: "8px",
          background: state.error ? "#fdeee8" : "#f0fdf4",
          color:      state.error ? "#b91c1c" : "#166534",
          border:     `1px solid ${state.error ? "#f2c4ae" : "#bbf7d0"}`,
        }} role="alert">
          {state.error ?? state.success}
        </div>
      )}

      <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
        <input
          type="text"
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void handleAdd(); }}
          placeholder="Add word…"
          maxLength={50}
          disabled={state.loading}
          aria-label="New banned word"
          style={{
            flex: 1, padding: "6px 10px", borderRadius: "8px",
            border: "1.5px solid #e2e8f0", fontSize: "12px", outline: "none",
          }}
        />
        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={state.loading || newWord.trim().length < 2}
          style={{
            padding: "6px 12px", borderRadius: "8px", border: "none",
            background: "#22c55e", color: "#fff", fontWeight: 700,
            fontSize: "12px", cursor: "pointer",
            opacity: state.loading || newWord.trim().length < 2 ? 0.5 : 1,
          }}
        >
          + Add
        </button>
      </div>

      {state.words.length === 0 ? (
        <p style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center", margin: "6px 0" }}>
         No dynamic words found.
        </p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
          {state.words.map((w) => (
            <span key={w} style={{
              display: "inline-flex", alignItems: "center", gap: "4px",
              padding: "2px 8px", borderRadius: "999px",
              background: "#fee2e2", color: "#991b1b", fontSize: "11px", fontWeight: 600,
            }}>
              {w}
              <button
                type="button"
                onClick={() => void handleRemove(w)}
                disabled={state.loading}
                aria-label={`"${w}" sil`}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "#991b1b", fontWeight: 700, fontSize: "13px", lineHeight: 1, padding: 0,
                }}
              >×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function useCurrentRole(): UserRole {
  const [role, setRole] = useState<UserRole>("student");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ROLE_LS_KEY) as UserRole | null;
      if (saved && saved in ROLE_META) setRole(saved);
    } catch {}
    function onStorage(e: StorageEvent) {
      if (e.key === ROLE_LS_KEY && e.newValue && e.newValue in ROLE_META) {
        setRole(e.newValue as UserRole);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return role;
}
