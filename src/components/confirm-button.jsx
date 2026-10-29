'use client'

export function ConfirmButton({ message = 'Are you sure?', children, className = '', ...props }) {
  return (
    <button
      {...props}
      type={props.type || 'submit'}
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault()
      }}
    >
      {children}
    </button>
  )
}
