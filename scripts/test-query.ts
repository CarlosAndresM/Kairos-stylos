import { db } from "../src/lib/db";

async function main() {
  const [rows]: any = await db.execute(`
    SELECT f.FC_NUMERO_FACTURA, fd.FD_VALOR, fd.FD_CANTIDAD, fp.FP_VALOR, fp.FP_CANTIDAD
    FROM KS_FACTURA_DETALLES fd
    JOIN KS_FACTURAS f ON f.FC_IDFACTURA_PK = fd.FC_IDFACTURA_FK
    LEFT JOIN KS_FACTURA_PRODUCTOS fp ON fp.FD_IDDETALLE_FK = fd.FD_IDDETALLE_PK
    WHERE f.FC_NUMERO_FACTURA = '396' OR f.FC_NUMERO_FACTURA = '0396'
  `);
  console.log("Invoice 0396 details:", rows);
  process.exit(0);
}
main();
