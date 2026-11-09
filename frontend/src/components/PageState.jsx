export function LoadingState({ label = 'Loading…' }) {
  return <div className="loading-state"><span className="loading-spinner" />{label}</div>
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="inline-error" role="alert">
      <span>{message}</span>
      {onRetry && <button className="text-button" onClick={onRetry} type="button">Try again</button>}
    </div>
  )
}
