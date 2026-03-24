-- 027_add_tipo_to_nominas.sql
-- Añadir tipo de nómina para distinguir entre técnicos y administradores

ALTER TABLE KS_NOMINAS 
ADD COLUMN NM_TIPO VARCHAR(50) DEFAULT 'TECNICO' AFTER NM_IDNOMINA_PK;

CREATE INDEX IDX_NOMINA_TIPO ON KS_NOMINAS(NM_TIPO);
