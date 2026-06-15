import { db } from "../src/lib/db";

async function main() {
  try {
    const [workers]: any = await db.execute(
      `SELECT TR_IDTRABAJADOR_PK, TR_NOMBRE, TR_ACTIVO, TR_FECHA_RETIRO, TR_MOTIVO_RETIRO
       FROM KS_TRABAJADORES 
       WHERE TR_NOMBRE LIKE '%Angel%'`
    );

    console.log("Trabajadores encontrados con 'Angel':");
    console.log(workers);

    for (const worker of workers) {
      console.log(`\n--- Nóminas para ${worker.TR_NOMBRE} (ID: ${worker.TR_IDTRABAJADOR_PK}) ---`);
      
      const [nominas]: any = await db.execute(
        `SELECT n.NM_IDNOMINA_PK, n.NM_FECHA_INICIO, n.NM_FECHA_FIN, n.NM_ESTADO, n.NM_TIPO, n.NM_FECHA_CREACION
         FROM KS_NOMINAS n
         JOIN KS_NOMINA_DETALLES nd ON n.NM_IDNOMINA_PK = nd.NM_IDNOMINA_FK
         WHERE nd.TR_IDTRABAJADOR_FK = ?
         ORDER BY n.NM_FECHA_FIN DESC`,
        [worker.TR_IDTRABAJADOR_PK]
      );
      console.log(nominas);
    }
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

main();
