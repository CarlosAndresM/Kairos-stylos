## Orden recomendado (capacitación desde cero)


| #   | Video                                       | Quién lo ve                           | Duración sugerida |
| --- | ------------------------------------------- | ------------------------------------- | ----------------- |
| 0   | Introducción: roles y menú                  | Todos                                 | 3–5 min           |
| 1   | Iniciar y cerrar sesión                     | Todos                                 | 2–3 min           |
| 2   | Crear una sucursal                          | Solo **Administrador Total**          | 3–4 min           |
| 3   | Crear usuario **Administrador Total**       | Solo **Administrador Total**          | 4–5 min           |
| 4   | Crear trabajador (técnico / admin de punto) | Admin Total y Admin Punto             | 5–6 min           |
| 5   | Catálogos: servicios y productos            | Admin Total y Admin Punto             | 6–8 min           |
| 6   | Parametrizar comisión de servicios (nómina) | Solo **Administrador Total**          | 4 min             |
| 7   | Registrar una venta (factura)               | Admin Total y Admin Punto             | 8–10 min          |
| 8   | Clientes (directorio)                       | Admin Total y Admin Punto             | 3 min             |
| 9   | Créditos y abonos                           | Admin Total y Admin Punto             | 5–6 min           |
| 10  | Vales (adelantos de nómina)                 | Admin Total y Admin Punto             | 5–6 min           |
| 11  | Servicio de trabajador                      | Admin Total y Admin Punto             | 5 min             |
| 12  | Gastos                                      | Admin Total y Admin Punto             | 4–5 min           |
| 13  | Solicitudes de productos                    | Admin Total y Admin Punto             | 4 min             |
| 14  | Nómina de técnicos                          | Solo **Administrador Total**          | 10–12 min         |
| 15  | Nómina de administradores de punto          | Solo **Administrador Total**          | 8 min             |
| 16  | Dashboard y decisiones                      | Admin Total (y Punto, vista limitada) | 6–8 min           |


---

## Video 0 — Introducción: roles y menú

**Ruta:** menú lateral tras login  

**Qué mostrar**

- Tres roles: **Administrador Total**, **Administrador de Punto**, **Técnico** (en trabajadores; los técnicos no entran al panel de admin en la práctica actual).
- Grupos del menú: Administración, Trabajador, Nómina, Negocio, Cliente.
- Qué ve cada rol (Admin Punto **no** ve: Usuarios Admin, Sucursales, Nómina Técnicos, Nómina Administradores).

**Notas para el video**

- **Vale** = adelanto de dinero al trabajador (se descuenta en nómina).
- **Servicio de trabajador** = deuda del personal ligada a una venta (método de pago distinto).
- **Crédito** = deuda de un **cliente** externo.
- En móvil: menú hamburguesa arriba a la izquierda.

---

## Video 1 — Iniciar sesión

**Ruta:** `/auth/login`  

**Pasos**

1. Abrir la URL de la app.
2. Campo **usuario** = nombre del trabajador (`TR_NOMBRE`, ej. `admin`), no el teléfono.
3. Contraseña → **Iniciar sesión**.
4. Redirección al dashboard según rol.

**Notas**

- El usuario debe estar **activo**; si no entra, revisar en Trabajadores/Usuarios Admin.
- Tras cambiar contraseña en servidor, hacer **recarga forzada** si aparece error de “Server Action” (build viejo en caché).
- Cerrar sesión al terminar el turno (buena práctica de seguridad).

---

## Video 2 — Crear una sucursal

**Ruta:** `/dashboard/sedes` · Menú: **Sucursales**  
**Rol:** solo **Administrador Total**

**Pasos**

1. Ir a **Sucursales**.
2. **+ Nueva** (o botón equivalente).
3. Nombre y dirección → Guardar.
4. (Opcional) Editar desde la tabla.
5. Eliminar: pide **contraseña del administrador** (seguridad).

**Notas**

- Crear sucursales **antes** de asignar trabajadores o admins de punto.
- No borrar una sede si tiene historial crítico; el sistema puede bloquear o pedir confirmación.
- Tras el wipe de BD, suele quedar **SUCURSAL CENTRAL** ligada a los admins del seed.

---

## Video 3 — Crear usuario Administrador Total

**Ruta:** `/dashboard/usuarios-admin` · Menú: **Usuarios Admin**  
**Rol:** solo **Administrador Total**

**Pasos**

1. **Usuarios Admin** → crear usuario.
2. Nombre (será el **usuario de login**), teléfono, contraseña, sucursal.
3. Rol fijo: **ADMINISTRADOR_TOTAL**.
4. Guardar y probar login con ese nombre.

**Notas**

- Un usuario por persona (no compartir `admin`).
- El login usa el **nombre**, no el teléfono.
- Para eliminar: contraseña de admin.

---

## Video 4 — Crear trabajador

**Ruta:** `/dashboard/trabajadores` · Menú: **Trabajadores**  
**Rol:** Admin Total (todas las sedes) · Admin Punto (solo su sede)

**Pasos**

1. **Trabajadores** → **+ Nuevo**.
2. Datos: nombre, teléfono, contraseña, **rol**, **sucursal**.
3. Roles disponibles aquí: **TECNICO** o **ADMINISTRADOR_PUNTO** (no Administrador Total).
4. Activar/desactivar sin borrar si ya tiene historial.

**Notas**

- **Técnico**: recibe comisiones en nómina; debe asignarse en cada línea de venta.
- **Administrador de Punto**: factura, gastos, personal de su sede; menú más corto.
- **Inactivar** en lugar de eliminar si ya facturó (protege reportes).
- Admin Punto solo ve trabajadores de **su** sucursal.

---

## Video 5 — Catálogos (servicios y productos)

**Ruta:** `/dashboard/catalogos` · Menú: **Servicios & Productos**

**Pasos — Servicios**

1. Pestaña o sección **Servicios** → crear nombre, activo/inactivo.
2. El precio se define **en la venta**, no precio fijo en catálogo.

**Pasos — Productos**

1. Crear producto.
2. Marcar **aplica comisión** y **% comisión** (ej. 10%) si el técnico gana por venderlo.

**Notas**

- Sin servicios/productos no puedes facturar bien.
- La comisión de **servicios** es global (video 6); la de **productos** es **por producto**.
- Desactivar ítem en lugar de borrar si ya se usó en facturas.

---

## Video 6 — Parametrizar nómina (comisión servicios)

**Ruta:** `/dashboard/nomina` → **Parametrizar Nómina Técnicos**  
**Rol:** solo **Administrador Total**

**Pasos**

1. Definir **% comisión de servicios** y **fecha de inicio** (vigencia).
2. Guardar; puede haber varias configs por fechas.
3. Explicar que afecta liquidaciones **futuras** del periodo.

**Notas**

- Hacer esto **antes** del primer cierre de nómina de técnicos.
- Ya no hay % global de producto; eso va en cada producto del catálogo.

---

## Video 7 — Registrar una venta (factura)

**Ruta:** `/dashboard/ventas` · **+ Nueva Venta**

**Pasos**

1. Cliente: nombre/teléfono (nuevo o recurrente).
2. Agregar **servicios**: servicio, valor, **técnico asignado**, cantidad si aplica.
3. Agregar **productos**: producto, valor, técnico, cantidad; comisión se calcula según catálogo.
4. **Pagos mixtos**: efectivo, transferencia, datáfono, crédito, servicio de trabajador.
5. Subir **evidencia** en transferencias / factura física si aplica.
6. Guardar → estado PENDIENTE / PAGADO según cobro.

**Notas**

- Cada línea con técnico distinto = comisiones correctas en nómina.
- **Crédito** genera deuda en módulo Créditos.
- **Servicio de trabajador** ≠ Vale; es deuda en la venta al personal.
- Admin Punto registra ventas de **su** sede.

---

## Video 8 — Clientes

**Ruta:** `/dashboard/clientes`

**Pasos**

1. Mostrar listado generado desde facturas (nombre, teléfono, visitas).
2. Buscar cliente; ver historial si la UI lo permite.

**Notas**

- No es un CRM aparte: se alimenta de **ventas**.
- Teléfono ayuda a identificar clientes recurrentes en nuevas facturas.

---

## Video 9 — Créditos y abonos

**Ruta:** `/dashboard/creditos`

**Pasos**

1. Listar facturas/clientes con saldo pendiente.
2. **Abonar**: monto, fecha, **foto del comprobante**.
3. Ver cómo baja el saldo pendiente.

**Notas**

- Sin evidencia no hay trazabilidad en auditoría.
- Abonos parciales están permitidos.
- Diferenciar siempre **crédito cliente** vs **vale trabajador**.

---

## Video 10 — Vales (adelantos de nómina)

**Ruta:** `/dashboard/vales`

**Pasos**

1. Crear vale: trabajador, monto, cuotas, fechas de desembolso e inicio de cobro.
2. Estados: pendiente → descontado al **confirmar nómina**.
3. Filtrar por sede/rol si aplica.

**Notas**

- Se descuenta en **nómina**, no en la factura del cliente.
- Configurar cuotas evita un solo descuento grande.
- El trabajador debe existir y estar activo.

---

## Video 11 — Servicio de trabajador

**Ruta:** `/dashboard/servicio-trabajador`

**Pasos**

1. Ver créditos del personal (desde ventas o caja).
2. Cuotas y fechas de cobro.
3. Relación con método de pago **SERVICIO DE TRABAJADOR** en ventas.

**Notas**

- Se descuenta en nómina (`ND_DEDUCCIONES_SERVICIOS_TRABAJADOR`).
- No confundir con el módulo **Vales**.

---

## Video 12 — Gastos

**Ruta:** `/dashboard/gastos`

**Pasos**

1. Registrar gasto: concepto, descripción, valor, fecha.
2. Gasto **por sede** vs gasto **general** (si la UI lo distingue).
3. Editar / listar / filtrar.

**Notas**

- Impactan la **ganancia real** del dashboard.
- Clasificar bien para reportes por sucursal vs negocio completo.

---

## Video 13 — Solicitudes de productos

**Ruta:** `/dashboard/solicitudes`

**Pasos**

1. Crear solicitud: producto, cantidad, trabajador, sucursal.
2. Estados: **Pendiente** → **Entregado** / **Cancelado**.
3. Comentarios y fecha de entrega.

**Notas**

- Flujo operativo sede ↔ inventario interno.
- Admin Punto solo su sucursal.

---

## Video 14 — Nómina de técnicos

**Ruta:** `/dashboard/nomina`

**Pasos**

1. Elegir periodo (semana).
2. **Pre-liquidación** / generar borrador.
3. **Lupa de auditoría**: facturas, servicios, productos, comisiones por técnico.
4. Revisar deducciones: vales + servicios de trabajador.
5. **Confirmar** nómina (cierra periodo, descuenta vales).

**Notas**

- Requiere ventas del periodo con técnicos asignados.
- Sin parametrización (video 6) las comisiones de servicio fallan o usan default.
- Confirmar solo cuando cuadre con caja/evidencias.

---

## Video 15 — Nómina administradores de punto

**Ruta:** `/dashboard/nomina-admin`  
**Rol:** solo **Administrador Total**

**Pasos**

1. Mismo flujo que técnicos pero rol `ADMINISTRADOR_PUNTO`.
2. Base / bonos / deducciones según reglas del módulo.
3. Confirmar periodo.

**Notas**

- Separado de nómina de técnicos (`NM_TIPO`).
- Solo admins de punto entran en este lote.

---

## Video 16 — Dashboard

**Ruta:** `/dashboard`

**Qué mostrar**

- Ventas, gastos, ganancia, créditos pendientes.
- Ventas por técnico / por periodo (según pestañas de `dashboard-client`).
- Cómo usar filtros de fechas y sede.

**Notas**

- Datos dependen de que ventas y gastos estén al día.
- Admin Total ve visión global; Admin Punto, su sede.

---

## Matriz rápida: menú vs rol


| Sección                               | Admin Total | Admin Punto |
| ------------------------------------- | ----------- | ----------- |
| Dashboard                             | ✓           | ✓           |
| Usuarios Admin                        | ✓           | —           |
| Sucursales                            | ✓           | —           |
| Ventas, Gastos                        | ✓           | ✓           |
| Trabajadores, Vales, Serv. trabajador | ✓           | ✓ (su sede) |
| Nómina técnicos / admin               | ✓           | —           |
| Catálogos, Solicitudes                | ✓           | ✓           |
| Clientes, Créditos                    | ✓           | ✓           |


---

## Tips generales para grabar

1. **Misma cuenta demo** por serie: `admin` en sucursal central, luego técnico y admin de punto creados en los videos 3–4.
2. **Un concepto por video**; al final, mini glosario de 20 s (vale / crédito / servicio trabajador).
3. Mostrar **errores comunes**: login con teléfono en vez de nombre; factura sin técnico; confundir vale con servicio de trabajador.
4. Usar capturas del manual en `public/manual_images/` como B-roll (`ventas.png`, `vales.png`, etc.).
5. Video “**Primer día en el negocio**”: 2 → 3 → 4 → 5 → 6 → 7 (orden mínimo operativo).

