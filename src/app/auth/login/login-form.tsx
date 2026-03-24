'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Lock, User } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from '@/lib/toast-helper'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import { loginSchema, type LoginFormData } from '@/features/auth/schema'
import { login } from '@/features/auth/services'

export function LoginForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitted },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      username: '',
      password: '',
      rememberMe: false,
    },
  })

  // Trigger toasts for validation errors only after trying to submit
  React.useEffect(() => {
    if (!isSubmitted) return

    const errorKeys = Object.keys(errors) as (keyof typeof errors)[]
    if (errorKeys.length > 0) {
      const firstError = errors[errorKeys[0]]
      if (firstError?.message) {
        toast.warning('Validación', {
          description: firstError.message,
          id: 'validation-error',
        })
      }
    }
  }, [errors, isSubmitted])

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true)
    try {
      // Usar Server Action directamente
      const result = await login(data)

      if (result.success) {
        toast.success('¡Bienvenido!', {
          description: 'Has iniciado sesión correctamente.',
          id: 'auth-success',
        })
        router.push('/dashboard')
      } else {
        toast.error('Error de inicio de sesión', {
          description: result.error || 'Credenciales incorrectas',
          id: 'auth-error',
        })
      }
    } catch (error) {
      console.error('Login Error:', error)
      toast.error('Error del sistema', {
        description: error instanceof Error ? error.message : 'Error desconocido al intentar iniciar sesión',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FieldGroup>
        {/* Username Field */}
        <Field>
          <FieldContent>
            <InputGroup className="bg-white/50 dark:bg-black/20 border-input h-11">
              <InputGroupAddon>
                <User className="text-[#FF7E5F] size-5" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Usuario"
                className="text-base"
                aria-invalid={!!errors.username}
                {...register('username')}
              />
            </InputGroup>
            {errors.username && <FieldError errors={[errors.username]} />}
          </FieldContent>
        </Field>

        {/* Password Field */}
        <Field>
          <FieldContent>
            <InputGroup className="bg-white/50 dark:bg-black/20 border-input h-11">
              <InputGroupAddon>
                <Lock className="text-[#FF7E5F] size-5" />
              </InputGroupAddon>
              <InputGroupInput
                type={showPassword ? 'text' : 'password'}
                placeholder="Contraseña"
                className="text-base"
                aria-invalid={!!errors.password}
                {...register('password')}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="text-muted-foreground size-5" />
                  ) : (
                    <Eye className="text-muted-foreground size-5" />
                  )}
                  <span className="sr-only">
                    {showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  </span>
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {errors.password && <FieldError errors={[errors.password]} />}
          </FieldContent>
        </Field>
      </FieldGroup>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Checkbox id="rememberMe" {...register('rememberMe')} />
          <label
            htmlFor="rememberMe"
            className="text-muted-foreground text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Recordarme
          </label>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full h-12 text-lg font-bold text-white uppercase tracking-wider bg-gradient-to-r from-[#FF7E5F] to-[#FEB47B] hover:opacity-90 transition-opacity rounded-xl shadow-lg shadow-orange-500/20"
      >
        {isLoading ? 'Iniciando sesión...' : 'INICIAR SESIÓN'}
      </Button>

    </form>

  )
}
