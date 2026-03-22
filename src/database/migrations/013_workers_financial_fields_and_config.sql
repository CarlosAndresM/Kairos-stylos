-- 013_workers_financial_fields_and_config.sql
-- Añadir sueldo base a trabajadores y tabla de parametrización de nómina

-- 1. Sueldo base para administrativos o técnicos con base
ALTER TABLE KS_TRABAJADORES 
ADD COLUMN TR_SUELDO_BASE DECIMAL(15, 2) DEFAULT 0;

-- 2. Tabla de configuración global de nómina (versionada por fecha de inicio)
CREATE TABLE KS_NOMINA_CONFIG (
  NC_IDCONFIG_PK INT AUTO_INCREMENT PRIMARY KEY,
  NC_PORCENTAJE_SERVICIO DECIMAL(5, 2) DEFAULT 50.00,
  NC_PORCENTAJE_PRODUCTO DECIMAL(5, 2) DEFAULT 100.00, -- Representa el porcentaje a DESCONTAR o PAGAR según lógica
  NC_FECHA_INICIO DATE NOT NULL,
  NC_FECHA_CREACION TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Seed inicial para la configuración
INSERT INTO KS_NOMINA_CONFIG (NC_PORCENTAJE_SERVICIO, NC_PORCENTAJE_PRODUCTO, NC_FECHA_INICIO)
VALUES (50.00, 100.00, '2024-01-01');

-- Índices para búsqueda por fecha
CREATE INDEX IDX_NOMINA_CONFIG_FECHA ON KS_NOMINA_CONFIG(NC_FECHA_INICIO);
