import type { InputHTMLAttributes } from 'react'

// Text input whose hint floats up into a label on focus / once filled, so the
// user never loses it. Pure CSS (.float in index.css); placeholder=" " is what
// makes :placeholder-shown flip, and the label must follow the input.
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
