"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="w-full max-w-sm text-center animate-rise">
            <div
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl rotate-3"
              style={{ background: "var(--color-gold-soft)" }}
            >
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-forest-deep)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              </svg>
            </div>
            <h2
              className="font-display text-xl font-bold"
              style={{ color: "var(--color-forest-deep)" }}
            >
              The lesson lost its place
            </h2>
            <p
              className="mt-2 text-sm leading-relaxed"
              style={{ color: "var(--color-ink-soft)" }}
            >
              Something broke while rendering the classroom. Nothing you
              typed was lost — pick up where you left off.
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-display text-sm font-bold text-white shadow-[0_4px_0_var(--color-forest-deep)] transition-transform active:translate-y-1 active:shadow-none"
              style={{ background: "var(--color-leaf-bright)" }}
            >
              Back to class
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
