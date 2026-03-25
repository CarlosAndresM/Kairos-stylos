'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: 'group-[.toaster]:bg-transparent group-[.toaster]:border-none group-[.toaster]:shadow-none group-[.toaster]:p-0 group-[.toaster]:m-0 group-[.toaster]:flex group-[.toaster]:justify-end',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
