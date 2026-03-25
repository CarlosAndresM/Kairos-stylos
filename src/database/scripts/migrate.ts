import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

import { env } from '@/lib/env';

async function migrate() {
  console.log('🚀 Iniciando procesos de base de datos...');

  // 1. Conectar al servidor sin base de datos para asegurar que exista
  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    port: parseInt(env.DB_PORT),
  });

  try {
    console.log(`- Asegurando que la base de datos ${env.DB_NAME} exista...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${env.DB_NAME}`);
    await connection.query(`USE ${env.DB_NAME}`);

    // 2. Crear tablas de control si no existen
    await connection.query(`
      CREATE TABLE IF NOT EXISTS KS_MIGRACIONES (
        MG_IDMIGRACION_PK INT AUTO_INCREMENT PRIMARY KEY,
        MG_NOMBRE VARCHAR(255) NOT NULL,
        MG_FECHA_EJECUCION TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Ejecutar Migraciones (DDL)
    const migrationsDir = path.join(process.cwd(), 'src/database/migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir).sort();
      const [rows]: any = await connection.query('SELECT MG_NOMBRE FROM KS_MIGRACIONES');
      const executed = new Set(rows.map((row: any) => row.MG_NOMBRE));

      for (const file of files) {
        if (executed.has(file)) continue;
        console.log(`- Cargando migración: ${file}...`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
        for (const statement of statements) await connection.query(statement);
        await connection.execute('INSERT INTO KS_MIGRACIONES (MG_NOMBRE) VALUES (?)', [file]);
        console.log(`✅ ${file} completada.`);
      }
    }

    console.log('✨ Migraciones completadas.');

    // --- 4. Hashear contraseñas (Post-Migración) ---
    console.log('🔐 Verificando seguridad de contraseñas...');
    const bcrypt = await import('bcrypt');
    const SALT_ROUNDS = 10;

    // Función para detectar si ya es un hash de bcrypt
    const isHashed = (p: string) => /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(p);

    const [workers]: any = await connection.query('SELECT tr_idtrabajador_pk, tr_nombre, tr_password FROM ks_trabajadores');
    let hashedCount = 0;

    for (const worker of workers) {
      if (worker.tr_password && !isHashed(worker.tr_password)) {
        console.log(`- Hasheando contraseña para: ${worker.tr_nombre}...`);
        const hash = await bcrypt.hash(worker.tr_password, SALT_ROUNDS);
        await connection.execute(
          'UPDATE ks_trabajadores SET tr_password = ? WHERE tr_idtrabajador_pk = ?',
          [hash, worker.tr_idtrabajador_pk]
        );
        hashedCount++;
      }
    }

    if (hashedCount > 0) {
      console.log(`✅ ${hashedCount} contraseñas fueron protegidas con éxito.`);
    } else {
      console.log('✅ Todas las contraseñas ya están seguras.');
    }

    console.log('🚀 Proceso finalizado exitosamente.');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
