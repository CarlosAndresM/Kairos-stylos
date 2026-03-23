-- 023_make_adelanto_fecha_nullable.sql
-- Hacer opcional la fecha de registro original en los adelantos

ALTER TABLE KS_ADELANTOS 
MODIFY COLUMN AD_FECHA DATE NULL;
