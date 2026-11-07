import { Component, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode; label?: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="m-4 rounded-2xl bg-card p-4 text-ink">
        <p className="font-semibold">Something went wrong{this.props.label ? ` in ${this.props.label}` : ""}.</p>
        <button
          className="mt-2 rounded-lg bg-gold px-3 py-1 font-semibold text-navy"
          onClick={() => {
            try { Object.keys(localStorage).filter((k) => k.startsWith("msoweek")).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
            window.location.reload();
          }}
        >
          Reset demo and reload
        </button>
      </div>
    );
  }
}
