-- 033_add_sucursal_to_vales.sql
-- Agregar relación de sucursal a la tabla de vales (anticipos)

-- 1. Agregar la columna permitiendo NULL inicialmente
ALTER TABLE KS_VALES 
ADD COLUMN SC_IDSUCURSAL_FK INT NULL;

-- 2. Asignar una sucursal por defecto a los registros existentes (asumiendo ID 1 existe, si no, se ajustará luego)
UPDATE KS_VALES SET SC_IDSUCURSAL_FK = 1 WHERE SC_IDSUCURSAL_FK IS NULL;

-- 3. Cambiar la columna a NOT NULL
ALTER TABLE KS_VALES 
MODIFY COLUMN SC_IDSUCURSAL_FK INT NOT NULL;

-- 4. Agregar la llave foránea
ALTER TABLE KS_VALES 
ADD CONSTRAINT FK_VALES_SUCURSAL 
FOREIGN KEY (SC_IDSUCURSAL_FK) REFERENCES KS_SUCURSALES(SC_IDSUCURSAL_PK);
