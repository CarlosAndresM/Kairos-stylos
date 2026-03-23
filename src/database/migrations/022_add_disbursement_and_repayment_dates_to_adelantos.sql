-- 022_add_disbursement_and_repayment_dates_to_adelantos.sql
-- Añadir fecha de desembolso y fecha de inicio de cobro a los adelantos

ALTER TABLE KS_ADELANTOS 
ADD COLUMN AD_FECHA_DESEMBOLSO DATE NULL,
ADD COLUMN AD_FECHA_INICIO_COBRO DATE NULL;
