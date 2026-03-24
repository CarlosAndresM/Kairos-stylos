'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Lock, User, Loader2 } from 'lucide-react'
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
            <InputGroup className="bg-slate-100/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 h-12 rounded-xl focus-within:border-[#FF7E5F] transition-all">
              <InputGroupAddon>
                <User className="text-[#FF7E5F] size-5" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="USUARIO"
                className="text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
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
            <InputGroup className="bg-slate-100/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 h-12 rounded-xl focus-within:border-[#FF7E5F] transition-all">
              <InputGroupAddon>
                <Lock className="text-[#FF7E5F] size-5" />
              </InputGroupAddon>
              <InputGroupInput
                type={showPassword ? 'text' : 'password'}
                placeholder="CONTRASEÑA"
                className="text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
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
                    <EyeOff className="text-slate-400 size-5" />
                  ) : (
                    <Eye className="text-slate-400 size-5" />
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
        <div className="flex items-center space-x-2 group cursor-pointer">
          <Checkbox id="rememberMe" {...register('rememberMe')} className="border-slate-300 data-[state=checked]:bg-[#FF7E5F] data-[state=checked]:border-[#FF7E5F]" />
          <label
            htmlFor="rememberMe"
            className="text-slate-600 dark:text-slate-300 text-xs font-black uppercase tracking-wider leading-none cursor-pointer group-hover:text-slate-900 transition-colors"
          >
            Recordarme
          </label>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full h-14 text-sm font-black text-white uppercase tracking-[0.2em] bg-gradient-to-r from-[#FF7E5F] to-[#FEB47B] hover:opacity-90 active:scale-[0.98] transition-all rounded-2xl shadow-xl shadow-orange-500/30 border-none"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            <span>INICIANDO...</span>
          </div>
        ) : 'INICIAR SESIÓN'}
      </Button>

      <div className="text-center">
        <a
          href="#"
          className="text-slate-400 hover:text-[#FF7E5F] text-[10px] font-black uppercase tracking-widest transition-all hover:underline underline-offset-8 decoration-2"
        >
          ¿Olvidaste tu contraseña?
        </a>
      </div>
    </form>
  )
}
