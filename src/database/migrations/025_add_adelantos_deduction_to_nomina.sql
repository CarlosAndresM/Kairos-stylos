-- 025_add_adelantos_deduction_to_nomina.sql
-- Añadir columna para deducciones de adelantos (vales reales) en la tabla de nómina

ALTER TABLE KS_NOMINA_DETALLES 
ADD COLUMN ND_DEDUCCIONES_ADELANTOS DECIMAL(15, 2) DEFAULT 0 AFTER ND_DEDUCCIONES_SERVICIOS_TRABAJADOR;
