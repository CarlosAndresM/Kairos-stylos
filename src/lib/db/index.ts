import mysql from 'mysql2/promise';
import { env } from '@/lib/env';

const globalForDb = global as unknown as {
  db: mysql.Pool | undefined;
}

const pool = globalForDb.db ?? mysql.createPool({
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  port: parseInt(env.DB_PORT),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

if (process.env.NODE_ENV !== 'production') globalForDb.db = pool;

// --- AQUÍ ESTÁ EL TRUCO ---
// Creamos un objeto que imita al pool pero intercepta el SQL y normaliza los resultados
export const db = {
  ...pool,
  execute: async (sql: string, params?: any) => {
    // 1. Normalizar SQL para nombres de tabla en minúsculas (compatibilidad Linux)
    const fixedSql = sql.replace(/(FROM|JOIN|UPDATE|INTO|TABLE)\s+([A-Z0-9_]+)/gi, (match, op, table) => {
      // Evitar tocar palabras reservadas o funciones
      if (['SET', 'SELECT', 'WHERE', 'AND', 'DESC', 'ASC', 'VALUES'].includes(table.toUpperCase())) return match;
      return `${op} ${table.toLowerCase()}`;
    });

    const [rows, fields] = await pool.execute(fixedSql, params);

    // 2. Normalizar las keys de los resultados a minúsculas
    if (Array.isArray(rows)) {
      const normalizedRows = rows.map((row: any) => {
        if (typeof row !== 'object' || row === null) return row;
        const normalized: any = {};
        for (const key in row) {
          normalized[key.toLowerCase()] = row[key];
        }
        return normalized;
      });
      return [normalizedRows, fields];
    }

    return [rows, fields];
  },
  query: async (sql: string, params?: any) => {
    const fixedSql = sql.replace(/(FROM|JOIN|UPDATE|INTO|TABLE)\s+([A-Z0-9_]+)/gi, (match, op, table) => {
      if (['SET', 'SELECT', 'WHERE', 'AND', 'DESC', 'ASC', 'VALUES'].includes(table.toUpperCase())) return match;
      return `${op} ${table.toLowerCase()}`;
    });

    const [rows, fields] = await pool.query(fixedSql, params);

    if (Array.isArray(rows)) {
      const normalizedRows = rows.map((row: any) => {
        if (typeof row !== 'object' || row === null) return row;
        const normalized: any = {};
        for (const key in row) {
          normalized[key.toLowerCase()] = row[key];
        }
        return normalized;
      });
      return [normalizedRows, fields];
    }

    return [rows, fields];
  }
} as mysql.Pool;