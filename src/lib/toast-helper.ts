import { toast as radixToast } from '@/hooks/use-toast'

type ToastOptions = {
  description?: string
  id?: string | number
  duration?: number
}

const createToast = (variant: 'success' | 'error' | 'info' | 'warning', _defaultDuration: number) => {
  return (title: string, descriptionOrOptions?: string | ToastOptions) => {
    let description: string | undefined

    if (typeof descriptionOrOptions === 'string') {
      description = descriptionOrOptions
    } else if (typeof descriptionOrOptions === 'object') {
      description = descriptionOrOptions.description
    }

    // Map variant to Radix toast variant
    // success -> success, error -> destructive, warning -> warning, info -> info
    const radixVariant = variant === 'error' ? 'destructive' : variant

    return radixToast({
      variant: radixVariant as any,
      title: title,
      description: description,
    })
  }
}

export const toast = {
  success: createToast('success', 4000),
  error: createToast('error', 5000),
  info: createToast('info', 4000),
  warning: createToast('warning', 4000),
  dismiss: (_id?: string | number) => {
    // Radix toast handles dismissal internally via Radix primitives
  },
}
