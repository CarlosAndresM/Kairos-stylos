Crea un prototipo funcional completo de presentación para un sistema de gestión de salón de belleza con múltiples sucursales. Todo debe funcionar 100% en el navegador usando localStorage para persistir datos. El objetivo es presentar al cliente un ejemplo funcional antes de desarrollar el sistema real.

IMPORTANTE: Este proyecto incluye una landing page existente (Next.js con diseño moderno en rosa y dorado) y se debe agregar un sistema administrativo completo que se accede desde la landing.

Tecnologías obligatorias:
- Next.js 14+ (App Router) - YA EXISTE LA LANDING PAGE
- TypeScript
- Tailwind CSS - YA CONFIGURADO CON ESTILOS ROSA Y DORADO
- localStorage para persistencia de datos
- React Context o Zustand para estado global
- React Hook Form para formularios
- Todo el código y etiquetas 100% en español

Landing Page (YA EXISTE):
- La landing page ya está desarrollada con secciones: Hero, Servicios, Nosotros, Testimonios, Contacto
- Diseño en rosa y dorado con fuente "Great Vibes" para el nombre de la empresa
- Logo: `/public/LOGO.png`
- Debes agregar un botón "Acceder" prominente en el header que redirija a `/login`
- El botón debe mantener el diseño elegante de la landing (gradiente rosa-dorado)

Roles y permisos (simulados con localStorage):
1. super_admin → acceso total a todo (dueño general)
2. admin_sucursal → solo ve y gestiona su propia sucursal (crea empleadas/cajeras, paga nómina, ve reportes solo de su sucursal)
3. cajera → solo registra cobros. Tiene un campo booleano en su perfil "puede_pagar_empleadas". Si está activado, también puede pagar nómina de su sucursal.
4. empleada → solo ve sus propios servicios, comisiones pendientes y pagos recibidos

Estructura de datos en localStorage:
- `kyroy_users` → array de usuarios con roles
- `kyroy_sucursales` → array de sucursales
- `kyroy_servicios` → array de servicios
- `kyroy_comisiones_especiales` → array de comisiones especiales
- `kyroy_cobros` → array de cobros registrados
- `kyroy_pagos_empleadas` → array de pagos a empleadas
- `kyroy_session` → usuario actual logueado

Modelos de datos (interfaces TypeScript):
```typescript
interface Sucursal {
  id: string
  nombre: string
  direccion: string
  telefono: string
  estado: 'activa' | 'inactiva'
  createdAt: string
}

interface User {
  id: string
  nombre: string
  email: string
  password: string // hasheado simple para demo
  sucursal_id: string | null
  role: 'super_admin' | 'admin_sucursal' | 'cajera' | 'empleada'
  puede_pagar_empleadas: boolean // solo para cajera
  activo: boolean
  createdAt: string
}

interface Servicio {
  id: string
  nombre: string
  precio_base: number
  comision_porcentaje_default: number
  activo: boolean
  createdAt: string
}

interface ComisionEspecial {
  id: string
  servicio_id: string
  user_id: string
  porcentaje: number
  fecha_inicio: string
  fecha_fin: string | null
  createdAt: string
}

interface Cobro {
  id: string
  sucursal_id: string
  fecha: string
  servicio_id: string
  empleada_id: string
  monto_cobrado: number
  forma_pago: 'efectivo' | 'transferencia'
  foto_comprobante: string | null // base64 o URL
  registrado_por: string // user_id
  comision_calculada: number
  pagado: boolean
  pago_id: string | null
  createdAt: string
}

interface PagoEmpleada {
  id: string
  sucursal_id: string
  empleada_id: string
  fecha_pago: string
  monto: number
  evidencia_pago: string | null // base64 o URL
  estado: 'pendiente' | 'confirmado'
  confirmado_por_empleada_at: string | null
  observaciones: string | null
  cobros_ids: string[] // IDs de cobros incluidos en este pago
  creado_por: string // user_id
  createdAt: string
}
```

Funcionalidades clave que debes generar COMPLETAS:

1. Sistema de autenticación:
   - Página de Login (`/login`) con diseño profesional que mantenga la estética de la landing
   - **LOGO OBLIGATORIO**: Mostrar el logo `/public/LOGO.png` centrado y prominente en el formulario de login
   - Formulario de login con email/password
   - Diseño elegante con los mismos colores de la landing (rosa y dorado)
   - Campos con bordes redondeados y efectos hover
   - Botón de login con gradiente rosa-dorado
   - Link "Volver a la página principal" que redirija a `/`
   - Persistencia de sesión en localStorage
   - Logout
   - Protección de rutas según rol
   - Middleware/guards para verificar permisos
   - Redirección automática: si ya está logueado, redirigir al dashboard según su rol

2. Dashboard personalizado según rol:
   - super_admin: ve todas las sucursales + gráficos globales
   - admin_sucursal y cajera: solo ve datos de su sucursal
   - empleada: solo ve sus propios datos
   - Widgets: ingresos/egresos del mes, saldo, top servicios, top empleadas, gráfico diario, gráfico por forma de pago
   - Usar Chart.js o Recharts para gráficos

3. Gestión de Sucursales (solo super_admin):
   - Lista de sucursales
   - Crear/editar/desactivar sucursales
   - Validaciones de formulario

4. Gestión de Usuarios:
   - Lista de usuarios (filtrada por sucursal según rol)
   - Crear/editar usuarios
   - Select de sucursal (obligatorio excepto super_admin)
   - Select de rol
   - Si rol = cajera → checkbox "Permitir pagar a empleadas"
   - Validaciones y permisos

5. Gestión de Servicios:
   - Lista de servicios
   - Crear/editar servicios
   - Repeater para comisiones especiales por empleada con fechas de vigencia
   - Validaciones

6. Registro de Cobros:
   - Formulario para registrar cobros
   - Autocompleta sucursal según usuario logueado
   - Select de servicio (muestra precio)
   - Select de empleada (solo de su sucursal)
   - Input de monto cobrado
   - Select forma de pago
   - Si transferencia → upload de foto comprobante (convertir a base64)
   - Al guardar calcula comisión pendiente automáticamente según:
     - Comisión especial vigente si existe
     - Comisión por defecto del servicio
   - Guarda en localStorage
   - Visible para cajera, admin_sucursal y super_admin

7. Pago de Nómina (acción personalizada):
   - Solo visible para super_admin, admin_sucursal y cajera con permiso habilitado
   - Modal/página para "Pagar nómina"
   - Elige empleada (solo de su sucursal)
   - Selecciona rango de fechas
   - Muestra checklist de cobros pendientes de pago de esa empleada en ese rango
   - Calcula total exacto con comisiones vigentes
   - Botón "Seleccionar todos"
   - Input para observaciones
   - Upload de evidencia de pago (foto/PDF convertido a base64)
   - Guarda pago como "pendiente"
   - Marca los cobros seleccionados como "pagado" y les asigna el pago_id

8. Panel de Empleada:
   - Dashboard con resumen de sus cobros
   - Lista de sus cobros (solo los suyos, filtrado automático)
   - Lista de pagos recibidos
   - En pagos pendientes: botón "Confirmar recibido"
   - Al confirmar: cambia estado a "confirmado" y guarda timestamp
   - Gráficos de sus comisiones y pagos

9. Utilidades y helpers:
   - Funciones para leer/escribir en localStorage
   - Funciones para calcular comisiones
   - Funciones para filtrar datos por sucursal según rol
   - Validaciones de permisos
   - Formateo de fechas y monedas
   - Manejo de imágenes (convertir a base64 para localStorage)

10. Datos iniciales (seed data):
    - 1 super_admin (email: admin@kyroy.com, password: admin123)
    - 2 sucursales (Sucursal Centro, Sucursal Norte)
    - 1 admin_sucursal por sucursal
    - 2 cajeras por sucursal (una con permiso de pago, otra sin)
    - 6 empleadas (3 por sucursal)
    - 5 servicios de ejemplo
    - Algunos cobros de ejemplo del mes actual
    - Algunos pagos pendientes y confirmados

Extras obligatorios:
- **Integración con Landing Page**:
  - Agregar botón "Acceder" en el header de la landing (componente `components/header.tsx`)
  - El botón debe tener el mismo estilo elegante (gradiente rosa-dorado, hover effects)
  - Mantener la consistencia visual entre landing y panel administrativo
  
- **Diseño del Panel Administrativo**:
  - Diseño moderno y profesional (similar a Filament pero con toques de rosa y dorado)
  - Sidebar con navegación según rol
  - Header con información del usuario y logout
  - Colores principales: rosa (#f472b6, #ec4899) y dorado (#fbbf24, #f59e0b)
  - Usar el logo en el sidebar y header del panel
  
- **Página de Login**:
  - Fondo elegante (puede ser gradiente suave o imagen)
  - Logo centrado y prominente (`/public/LOGO.png`)
  - Formulario centrado con sombras y bordes redondeados
  - Campos de input con estilo moderno
  - Botón de login con gradiente rosa-dorado y efectos hover
  - Link para volver a la landing
  
- **Funcionalidades técnicas**:
  - Todo responsive (móvil, tablet, desktop)
  - Validaciones de formularios completas
  - Mensajes de éxito/error con toasts
  - Confirmaciones antes de acciones importantes
  - Loading states
  - Manejo de errores
  - Exportar datos a JSON (opcional, para backup)
  - Importar datos desde JSON (opcional, para restaurar)
  - Protección de rutas: redirigir a login si no está autenticado
  - Redirección según rol después del login

Estructura de carpetas sugerida (INTEGRAR CON LANDING EXISTENTE):
```
app/
├── page.tsx (Landing page - YA EXISTE)
├── login/
│   └── page.tsx (NUEVO - Página de login con logo)
├── admin/ (NUEVO - Panel administrativo)
│   ├── layout.tsx (Layout con sidebar y header)
│   ├── dashboard/
│   │   └── page.tsx
│   ├── sucursales/
│   │   └── page.tsx
│   ├── usuarios/
│   │   └── page.tsx
│   ├── servicios/
│   │   └── page.tsx
│   ├── cobros/
│   │   └── page.tsx
│   ├── pagos/
│   │   └── page.tsx
│   └── empleada/ (panel especial para empleadas)
│       └── page.tsx
components/
├── header.tsx (YA EXISTE - AGREGAR botón "Acceder")
├── hero.tsx (YA EXISTE)
├── services.tsx (YA EXISTE)
├── about.tsx (YA EXISTE)
├── testimonials.tsx (YA EXISTE)
├── contact.tsx (YA EXISTE)
├── footer.tsx (YA EXISTE)
└── admin/ (NUEVO - Componentes del panel administrativo)
    ├── layout/
    │   ├── Sidebar.tsx
    │   ├── Header.tsx
    │   └── ProtectedRoute.tsx
    ├── forms/
    ├── tables/
    ├── widgets/
    └── charts/
lib/
├── storage.ts (NUEVO - funciones localStorage)
├── auth.ts (NUEVO - autenticación)
├── permissions.ts (NUEVO - verificación de permisos)
├── calculations.ts (NUEVO - cálculos de comisiones)
└── seed.ts (NUEVO - datos iniciales)
types/
└── index.ts (NUEVO - interfaces TypeScript)
hooks/
└── useAuth.ts, useStorage.ts, etc. (NUEVO)
```

Genera TODO el código listo para copiar:
- **Modificación del header existente**: Agregar botón "Acceder" que redirija a `/login`
- **Nueva página de login** (`app/login/page.tsx`):
  - Formulario con logo centrado
  - Diseño elegante que mantenga la estética de la landing
  - Validaciones y manejo de errores
- Configuración del proyecto (package.json, tsconfig, etc.) - solo lo que falte
- Todas las interfaces TypeScript
- Funciones de utilidad para localStorage
- Sistema de autenticación completo
- Layout del panel administrativo (sidebar, header, protected routes)
- Todos los componentes de UI del panel
- Todas las páginas/vistas del panel administrativo
- Lógica de permisos y filtros
- Datos iniciales (seed)
- Estilos con Tailwind CSS (usar los colores existentes de la landing)

Quiero que al pegar todo en Cursor y ejecutar:
```bash
npm install
npm run dev
```
tenga el prototipo 100% funcional con:
- Login funcional
- Todos los roles trabajando
- Multi-sucursal funcionando
- Cajera con permiso opcional de pago
- Administrador por sucursal
- Registro de cobros
- Pago de nómina
- Confirmación de pagos por empleadas
- Dashboard con gráficos
- Todo persistido en localStorage

El objetivo es que el cliente pueda probar TODO el flujo completo antes de desarrollar el sistema real con Laravel/Filament.

