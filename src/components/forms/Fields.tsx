"use client";

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

/**
 * Form primitives (spec §5): every field has a visible label; errors and hints are linked with
 * aria-describedby, invalid fields carry aria-invalid. Touch targets are at least 44 px high.
 */
const control =
  "mt-1 block w-full rounded border-2 bg-white px-3 py-2 text-ink placeholder:text-muted focus:border-primary aria-[invalid=true]:border-error";

type Common = { id: string; label: string; error?: string | null; hint?: string };

function describedBy(id: string, error?: string | null, hint?: string) {
  return [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
}

function Message({ id, error, hint }: { id: string; error?: string | null; hint?: string }) {
  return (
    <>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm font-semibold text-error">
          {error}
        </p>
      )}
    </>
  );
}

export function Input({ id, label, error, hint, className, ...props }: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={`${control} min-h-11 border-muted/40`}
        {...props}
      />
      <Message id={id} error={error} hint={hint} />
    </div>
  );
}

export function Textarea({ id, label, error, hint, className, ...props }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className={className}>
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={`${control} border-muted/40`}
        {...props}
      />
      <Message id={id} error={error} hint={hint} />
    </div>
  );
}

export function Checkbox({
  id,
  label,
  error,
  hint,
  className,
  children,
  ...props
}: Common & InputHTMLAttributes<HTMLInputElement> & { children?: React.ReactNode }) {
  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          className="mt-1 h-6 w-6 shrink-0 accent-primary"
          {...props}
        />
        <label htmlFor={id}>
          {label} {children}
        </label>
      </div>
      <Message id={id} error={error} hint={hint} />
    </div>
  );
}

/**
 * Radio buttons in a fieldset whose legend is the question. The error summary links to the first
 * option (`${id}-${options[0].value}`).
 */
export function RadioGroup({
  id,
  name,
  label,
  options,
  value,
  onChange,
  error,
  hint,
  className,
}: Common & {
  name: string;
  options: { value: string; label: string }[];
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}) {
  return (
    <fieldset id={id} aria-describedby={describedBy(id, error, hint)} className={className}>
      <legend className="font-semibold">{label}</legend>
      <div className="mt-2 flex flex-col gap-1">
        {options.map((option) => (
          <div key={option.value} className="flex min-h-11 items-center gap-3">
            <input
              id={`${id}-${option.value}`}
              type="radio"
              name={name}
              value={option.value}
              checked={value === undefined ? undefined : value === option.value}
              onChange={() => onChange?.(option.value)}
              className="h-6 w-6 shrink-0 accent-primary"
            />
            <label htmlFor={`${id}-${option.value}`}>{option.label}</label>
          </div>
        ))}
      </div>
      <Message id={id} error={error} hint={hint} />
    </fieldset>
  );
}

/** List of errors at the top of the form, focused after a failed send; each links to its field. */
export const ErrorSummary = forwardRef<
  HTMLDivElement,
  { id: string; title: string; items: { id: string; text: string }[]; formError?: string | null }
>(function ErrorSummary({ id, title, items, formError }, ref) {
  if (!items.length && !formError) return null;
  return (
    <div id={id} ref={ref} tabIndex={-1} role="alert" className="rounded border-2 border-error bg-white p-4">
      {formError ? (
        <p className="font-semibold text-error">{formError}</p>
      ) : (
        <>
          <p className="font-semibold text-error">{title}</p>
          <ul className="mt-2 list-disc ps-5">
            {items.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`}>{item.text}</a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
});
