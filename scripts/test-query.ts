import { db } from "../src/lib/db";

async function main() {
  const [rows]: any = await db.execute(`
       SELECT fp.*, f.FC_ESTADO, f.FC_FECHA
       FROM KS_FACTURA_PRODUCTOS fp
       JOIN KS_FACTURAS f ON fp.FC_IDFACTURA_FK = f.FC_IDFACTURA_PK
       WHERE DATE(f.FC_FECHA) = CURDATE()
  `);
  console.log("Today's Products:", rows);
  process.exit(0);
}
main();
