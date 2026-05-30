import { useCallback, useEffect, useId, useRef, useState } from 'react'
import EmojiPicker, { Theme } from 'emoji-picker-react'

function syncSelection(target, selectionRef) {
  if (!target) return
  selectionRef.current = {
    start: target.selectionStart ?? 0,
    end: target.selectionEnd ?? 0,
  }
}

export function EmojiTextField({
  id: idProp,
  label,
  value,
  onChange,
  maxLength,
  placeholder,
  multiline = false,
  rows = 4,
  helperText,
  inputClassName = '',
}) {
  const generatedId = useId()
  const fieldId = idProp ?? generatedId
  const containerRef = useRef(null)
  const fieldRef = useRef(null)
  const selectionRef = useRef({ start: 0, end: 0 })
  const [pickerOpen, setPickerOpen] = useState(false)

  const handleSelectionSync = useCallback((event) => {
    syncSelection(event.target, selectionRef)
  }, [])

  const insertEmoji = useCallback(
    (emoji) => {
      const current = String(value ?? '')
      const { start, end } = selectionRef.current
      const next = `${current.slice(0, start)}${emoji}${current.slice(end)}`
      if (maxLength != null && next.length > maxLength) return

      onChange(next)
      const nextPos = start + emoji.length
      selectionRef.current = { start: nextPos, end: nextPos }

      requestAnimationFrame(() => {
        const el = fieldRef.current
        if (!el) return
        el.focus()
        el.setSelectionRange(nextPos, nextPos)
      })

      setPickerOpen(false)
    },
    [maxLength, onChange, value],
  )

  useEffect(() => {
    if (!pickerOpen) return undefined

    const handlePointerDown = (event) => {
      if (containerRef.current?.contains(event.target)) return
      setPickerOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [pickerOpen])

  const fieldClassName = `min-w-0 flex-1 rounded-xl border border-border px-4 py-3 text-sm text-ink ${inputClassName}`

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label htmlFor={fieldId} className="text-xs font-bold uppercase tracking-wide text-muted">
          {label}
        </label>
      )}

      <div className={`flex items-stretch gap-2 ${label ? 'mt-2' : ''}`}>
        {multiline ? (
          <textarea
            ref={fieldRef}
            id={fieldId}
            rows={rows}
            maxLength={maxLength}
            value={value}
            placeholder={placeholder}
            onChange={(event) => {
              onChange(event.target.value)
              syncSelection(event.target, selectionRef)
            }}
            onClick={handleSelectionSync}
            onKeyUp={handleSelectionSync}
            onSelect={handleSelectionSync}
            className={fieldClassName}
          />
        ) : (
          <input
            ref={fieldRef}
            id={fieldId}
            type="text"
            maxLength={maxLength}
            value={value}
            placeholder={placeholder}
            onChange={(event) => {
              onChange(event.target.value)
              syncSelection(event.target, selectionRef)
            }}
            onClick={handleSelectionSync}
            onKeyUp={handleSelectionSync}
            onSelect={handleSelectionSync}
            className={fieldClassName}
          />
        )}

        <button
          type="button"
          aria-label="Insertar emoji"
          aria-expanded={pickerOpen}
          aria-controls={`${fieldId}-emoji-picker`}
          onClick={() => {
            syncSelection(fieldRef.current, selectionRef)
            setPickerOpen((open) => !open)
          }}
          className="inline-flex shrink-0 items-center justify-center rounded-xl border border-border bg-slate-50 px-3 py-3 text-xl leading-none text-ink transition-colors hover:bg-white"
        >
          <span aria-hidden>😀</span>
        </button>
      </div>

      {helperText && <p className="mt-1.5 text-xs text-muted">{helperText}</p>}

      {pickerOpen && (
        <div
          id={`${fieldId}-emoji-picker`}
          className="absolute right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border bg-white shadow-lg"
        >
          <EmojiPicker
            theme={Theme.LIGHT}
            width={320}
            height={380}
            searchPlaceHolder="Buscar emoji"
            previewConfig={{ showPreview: true }}
            onEmojiClick={({ emoji }) => insertEmoji(emoji)}
          />
        </div>
      )}
    </div>
  )
}
