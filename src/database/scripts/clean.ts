import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import fs from 'fs';

// Cargar variables de entorno
dotenv.config();

const DB_CONFIG = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306'),
};

async function clean() {
  console.log('🧹 Limpiando datos de prueba y transacciones...');

  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    // Deshabilitar FK checks para poder truncar tablas relacionadas
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    const tablesToTruncate = [
      'KS_PAGOS_FACTURA',
      'KS_FACTURA_DETALLES',
      'KS_FACTURA_PRODUCTOS',
      'KS_FACTURAS',
      'KS_SERVICIO_TRABAJADOR_CUOTAS',
      'KS_SERVICIOS_TRABAJADOR',
      'KS_VALES',
      'KS_GASTOS',
      'KS_NOMINA_DETALLES',
      'KS_NOMINAS',
      'KS_SERVICIOS',
      'KS_PRODUCTOS',
      'KS_CREDITO_ABONOS',
      'KS_CREDITOS'
    ];


    for (const table of tablesToTruncate) {
      console.log(`- Limpiando tabla: ${table}...`);
      await connection.query(`TRUNCATE TABLE ${table}`);
    }

    // Limpiar trabajadores que sean técnicos (mantener administradores)
    console.log('- Eliminando técnicos de prueba...');
    await connection.query(`
      DELETE FROM KS_TRABAJADORES 
      WHERE RL_IDROL_FK IN (SELECT RL_IDROL_PK FROM KS_ROLES WHERE RL_NOMBRE = 'TECNICO')
    `);

    // Resetear auto_increment de trabajadores si es necesario (opcional)
    // await connection.query('ALTER TABLE KS_TRABAJADORES AUTO_INCREMENT = 3');

    // Re-habilitar FK checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('✅ Base de datos limpia (configuración core mantenida).');
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

clean();
