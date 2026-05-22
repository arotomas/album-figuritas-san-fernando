export function Input({ label, id, className = '', ...props }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-medium uppercase tracking-wide text-muted"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className="w-full rounded-xl border border-border bg-white px-4 py-3.5 text-base text-ink outline-none transition-colors placeholder:text-gray-300 focus:border-ink"
        {...props}
      />
    </div>
  )
}
