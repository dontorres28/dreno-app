import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react'

// Floating-label fields, one consistent treatment for everything a person fills
// in. The hint rests inside the box and floats up into a label on focus / once
// filled. Pure CSS (.float in index.css): the input/textarea carry
// placeholder=" " so :placeholder-shown drives it; selects and date inputs are
// never placeholder-shown, so their label simply stays floated — which is what
// we want, since they always have a value.

export default function FloatingField({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="float">
      <input {...props} className="input" placeholder=" " />
      <label>{label}</label>
    </div>
  )
}

export function FloatingTextarea({
  label,
  ...props
}: { label: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="float">
      <textarea {...props} className="input" placeholder=" " />
      <label>{label}</label>
    </div>
  )
}

export function FloatingSelect({
  label,
  children,
  ...props
}: { label: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="float float--select">
      <select {...props} className="input">{children}</select>
      <label>{label}</label>
    </div>
  )
}
