Crea un proyecto Laravel 11 + Filament v3 completo y 100 % funcional para un salón de belleza con múltiples sucursales. Todo debe estar en español.

Tecnologías obligatorias:
- Laravel 11
- Filament 3.2+ con panel admin
- Filament/Shield para roles y permisos (usa Spatie Laravel Permission debajo)
- Spatie Media Library para subir fotos y evidencias
- MySQL
- Todo el código y etiquetas 100 % en español

Roles y permisos (usa Shield + permisos personalizados):
1. super_admin → acceso total a todo (dueño general)
2. admin_sucursal → solo ve y gestiona su propia sucursal (crea empleadas/cajeras, paga nómina, ve reportes solo de su sucursal)
3. cajera → solo registra cobros. Tiene un campo booleano en su perfil "puede_pagar_empleadas" (check sí/no). Si está activado, también puede pagar nómina de su sucursal.
4. empleada → solo ve sus propios servicios, comisiones pendientes y pagos recibidos

Modelos y migraciones necesarias:
- Sucursal (nombre, direccion, telefono, estado)
- User (belongsTo Sucursal, role: super_admin|admin_sucursal|cajera|empleada, puede_pagar_empleadas: boolean solo para cajera)
- Servicio (nombre, precio_base, comision_porcentaje_default, activo)
- ComisionEspecial (servicio_id, user_id (empleada), porcentaje, fecha_inicio, fecha_fin nullable)
- Cobro (sucursal_id, fecha, servicio_id, empleada_id, monto_cobrado, forma_pago: efectivo|transferencia, foto_comprobante nullable, registrado_por user)
- PagoEmpleada (sucursal_id, empleada_id, fecha_pago, monto, evidencia_pago, estado: pendiente|confirmado, confirmado_por_empleada_at nullable, observaciones)

Funcionalidades clave que debes generar COMPLETAS:

1. Dashboard personalizado según rol:
   - super_admin: ve todas las sucursales + gráficos globales
   - admin_sucursal y cajera: solo ve datos de su sucursal
   - Widgets: ingresos/egresos del mes, saldo, top servicios, top empleadas, gráfico diario, gráfico por forma de pago

2. SucursalResource (solo super_admin crea/edita sucursales)

3. UserResource con:
   - Select de sucursal (obligatorio excepto super_admin)
   - Select de rol
   - Si rol = cajera → checkbox "Permitir pagar a empleadas"

4. ServicioResource + repeater para comisiones especiales por empleada y vigencia

5. CobroResource (visible para cajera y admin_sucursal y super_admin)
   - Autocompleta sucursal según usuario logueado
   - Si transferencia → foto comprobante obligatoria
   - Al guardar calcula comisión pendiente automáticamente

6. PagoEmpleadaResource con acción personalizada “Pagar nómina”:
   - Solo visible para super_admin, admin_sucursal y cajera con permiso habilitado
   - Elige empleada (solo de su sucursal) + rango de fechas
   - Muestra checklist de cobros pendientes de pago
   - Calcula total exacto con comisiones vigentes
   - Botón “Seleccionar todos”
   - Sube evidencia (foto/PDF)
   - Guarda pago como “pendiente”
   - La empleada ve el pago y puede dar clic en “Confirmar recibido”

7. Panel de Empleada:
   - Solo ve sus cobros, comisiones y pagos (filtrado automáticamente por user_id)
   - Botón “Confirmar recibido” en pagos pendientes

Extras obligatorios:
- Todas las políticas (Policies) y scopes para que nadie vea datos de otra sucursal
- Scopes globales en modelos para filtrar por sucursal automáticamente
- Notificaciones Filament cuando se crea un pago pendiente
- Todo responsive
- Seeder con: 1 super_admin, 2 sucursales, 1 admin_sucursal por sucursal, 2 cajeras (una con permiso de pago, otra sin), 6 empleadas

Genera TODO el código listo para copiar:
- Migraciones completas
- Modelos con relaciones y scopes
- Todos los Resources con forms, tables, actions y políticas
- Dashboard con widgets según rol
- Configuración completa de Shield + permisos personalizados
- Seeder listo

Quiero que al pegar todo en Cursor y ejecutar:
composer require filament/filament filament/shield spatie/laravel-media-library
php artisan migrate --seed
tenga el sistema 100 % funcional con multi-sucursal, cajera con permiso opcional de pago y administrador por sucursal en menos de 1 hora.