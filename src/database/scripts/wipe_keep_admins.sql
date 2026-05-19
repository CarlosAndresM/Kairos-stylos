-- Requiere migraciones 000-030 aplicadas (npm run db:migrate).
-- Base de datos: kairos_stylos
-- En servidores Linux las tablas suelen guardarse en minúsculas.

USE kairos_stylos;

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE ks_credito_abonos;
TRUNCATE TABLE ks_creditos;
TRUNCATE TABLE ks_pagos_factura;
TRUNCATE TABLE ks_factura_productos;
TRUNCATE TABLE ks_factura_detalles;
TRUNCATE TABLE ks_facturas;
TRUNCATE TABLE ks_servicio_trabajador_cuotas;
TRUNCATE TABLE ks_servicios_trabajador;
TRUNCATE TABLE ks_vales;
TRUNCATE TABLE ks_nomina_detalles;
TRUNCATE TABLE ks_nominas;
TRUNCATE TABLE ks_nomina_config;
TRUNCATE TABLE ks_gastos;
TRUNCATE TABLE ks_solicitudes_productos;
TRUNCATE TABLE ks_servicios;
TRUNCATE TABLE ks_productos;

SET FOREIGN_KEY_CHECKS = 1;

DELETE t
FROM ks_trabajadores t
INNER JOIN ks_roles r ON t.rl_idrol_fk = r.rl_idrol_pk
WHERE r.rl_nombre NOT IN ('ADMINISTRADOR_TOTAL', 'ADMINISTRADOR_PUNTO');

-- Conserva: ks_migraciones, ks_roles, ks_metodos_pago, ks_sucursales, administradores.
