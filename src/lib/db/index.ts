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

// --- NORMALIZACIÓN DE SQL PARA LINUX ---
const normalizeSql = (sql: any) => {
  if (typeof sql === 'string') {
    return sql.replace(/(FROM|JOIN|UPDATE|INTO|TABLE)\s+([A-Z0-9_]+)/gi, (match, op, table) => {
      const upperTable = table.toUpperCase();
      if (['SET', 'SELECT', 'WHERE', 'AND', 'DESC', 'ASC', 'VALUES', 'LIMIT', 'OFFSET'].includes(upperTable)) return match;
      return `${op} ${table.toLowerCase()}`;
    });
  }
  return sql;
};

// --- NORMALIZACIÓN DE RESULTADOS ---
const normalizeRows = (rows: any) => {
  if (Array.isArray(rows)) {
    return rows.map((row: any) => {
      if (typeof row !== 'object' || row === null) return row;
      const normalized: any = {};
      for (const key in row) {
        const lowerKey = key.toLowerCase();
        const upperKey = key.toUpperCase();
        normalized[key] = row[key];         // Mantener original
        normalized[lowerKey] = row[key];    // Forzar minúscula (compatibilidad auth/v1)
        normalized[upperKey] = row[key];    // Forzar mayúscula (compatibilidad Zod/v2)
      }
      return normalized;
    });
  }
  return rows;
};

// --- PROXY PARA CONEXIONES (TRANSACCIONES) ---
const connectionProxyHandler: ProxyHandler<mysql.PoolConnection> = {
  get(target, prop, receiver) {
    const value = Reflect.get(target, prop, receiver);
    if (prop === 'execute' || prop === 'query') {
      return async (sql: any, params?: any) => {
        const [rows, fields] = await (target as any)[prop](normalizeSql(sql), params);
        return [normalizeRows(rows), fields];
      };
    }
    // Retornar la función bindeada al target original para evitar errores de contexto
    return typeof value === 'function' ? value.bind(target) : value;
  }
};

// --- PROXY PARA EL POOL PRINCIPAL ---
const poolProxyHandler: ProxyHandler<mysql.Pool> = {
  get(target, prop, receiver) {
    const value = Reflect.get(target, prop, receiver);

    // Proxy de métodos de consulta directa
    if (prop === 'execute' || prop === 'query') {
      return async (sql: any, params?: any) => {
        const [rows, fields] = await (target as any)[prop](normalizeSql(sql), params);
        return [normalizeRows(rows), fields];
      };
    }

    // Proxy para obtener la conexión (importante para transacciones)
    if (prop === 'getConnection') {
      return async () => {
        const connection = await target.getConnection();
        return new Proxy(connection, connectionProxyHandler);
      };
    }

    // Retornar cualquier otro método bindeadolo al pool original
    return typeof value === 'function' ? value.bind(target) : value;
  }
};

// Exportar el pool envuelto en el Proxy
export const db = new Proxy(pool, poolProxyHandler);