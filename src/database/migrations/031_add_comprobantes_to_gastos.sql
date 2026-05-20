-- Agrega soporte para guardar múltiples URLs de comprobantes fotográficos en formato JSON
ALTER TABLE KS_GASTOS ADD COLUMN GS_COMPROBANTES JSON NULL;
