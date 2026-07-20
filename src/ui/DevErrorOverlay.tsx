import { Component } from 'react'
import type { CSSProperties, ErrorInfo, ReactNode } from 'react'

const box: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  background: '#160000',
  color: '#ff9a9a',
  font: '13px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace',
  padding: 24,
  overflow: 'auto',
  whiteSpace: 'pre-wrap',
  pointerEvents: 'auto',
}

/** Turns a blank-screen crash into a readable on-screen error, so failures are
 * diagnosable without DevTools. Catches React render errors + uncaught globals. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { err: Error | null; global: string[] }> {
  state = { err: null as Error | null, global: [] as string[] }

  componentDidMount() {
    window.addEventListener('error', this.onError)
    window.addEventListener('unhandledrejection', this.onRejection)
  }
  componentWillUnmount() {
    window.removeEventListener('error', this.onError)
    window.removeEventListener('unhandledrejection', this.onRejection)
  }
  onError = (e: ErrorEvent) => this.setState((s) => ({ global: [...s.global, `Error: ${e.message}`] }))
  onRejection = (e: PromiseRejectionEvent) =>
    this.setState((s) => ({ global: [...s.global, `Unhandled rejection: ${String(e.reason)}`] }))

  static getDerivedStateFromError(err: Error) {
    return { err }
  }
  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('Rage Room crash:', err, info)
  }

  render() {
    const { err, global } = this.state
    if (err) {
      return (
        <div style={box}>
          {'⚠ Rage Room crashed (React render)\n\n'}
          {err.message}
          {'\n\n'}
          {err.stack}
          {global.length > 0 && `\n\n--- also ---\n${global.join('\n')}`}
        </div>
      )
    }
    if (global.length > 0) {
      return (
        <>
          {this.props.children}
          <div style={{ ...box, inset: 'auto 0 0 0', maxHeight: '40%' }}>
            {'⚠ Runtime errors:\n'}
            {global.join('\n')}
          </div>
        </>
      )
    }
    return this.props.children
  }
}
