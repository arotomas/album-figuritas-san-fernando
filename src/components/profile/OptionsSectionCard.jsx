export function OptionsSectionCard({ title, description, children, className = '' }) {
  return (
    <section
      className={`rounded-2xl border border-border/80 bg-surface p-5 shadow-sm ${className}`}
    >
      <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
      {description ? (
        <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
      ) : null}
      {children}
    </section>
  )
}
