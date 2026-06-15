import { db } from "../src/lib/db";

async function main() {
  try {
    const workerId = 48;

    const [nominas]: any = await db.execute(
      `SELECT n.NM_IDNOMINA_PK, n.NM_FECHA_INICIO, n.NM_FECHA_FIN, n.NM_ESTADO, n.NM_TIPO, n.NM_FECHA_CREACION, nd.ND_TOTAL_NETO
       FROM KS_NOMINAS n
       JOIN KS_NOMINA_DETALLES nd ON n.NM_IDNOMINA_PK = nd.NM_IDNOMINA_FK
       WHERE nd.TR_IDTRABAJADOR_FK = ?
       ORDER BY n.NM_FECHA_CREACION DESC`,
      [workerId]
    );

    console.log("=== NÓMINAS ===");
    console.table(nominas);

    const [vales]: any = await db.execute(
      `SELECT VL_IDVALE_PK, VL_MONTO, VL_CUOTAS, VL_CUOTAS_PAGADAS, VL_ESTADO, NM_IDNOMINA_FK
       FROM KS_VALES
       WHERE TR_IDTRABAJADOR_FK = ?`,
      [workerId]
    );

    console.log("\n=== VALES ===");
    console.table(vales);

    const [worker]: any = await db.execute(
      `SELECT TR_ACTIVO, TR_FECHA_RETIRO FROM KS_TRABAJADORES WHERE TR_IDTRABAJADOR_PK = ?`,
      [workerId]
    );

    console.log("\n=== TRABAJADOR ===");
    console.table(worker);

  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

main();
