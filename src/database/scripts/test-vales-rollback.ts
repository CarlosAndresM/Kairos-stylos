import { db } from '../../lib/db';
import { createValeMutation } from '../../features/vales/mutations';
import { confirmarNomina, desconfirmarNomina } from '../../features/nomina/services';

async function runTests() {
  console.log('🧪 INICIANDO PRUEBAS DE RESPALDO Y DEVOLUCIÓN DE VALES (ROLLBACK)...');

  // 1. Obtener un trabajador activo para la prueba
  const [workers]: any = await db.execute(
    `SELECT TR_IDTRABAJADOR_PK, TR_NOMBRE 
     FROM KS_TRABAJADORES 
     WHERE TR_ACTIVO = 1 LIMIT 1`
  );

  if (workers.length === 0) {
    console.error('❌ Error: No se encontraron trabajadores activos para realizar el test.');
    process.exit(1);
  }

  const worker = workers[0];
  console.log(`👤 Trabajador seleccionado para pruebas: "${worker.TR_NOMBRE}" (ID: ${worker.TR_IDTRABAJADOR_PK})`);

  // Obtener sucursal válida
  const [sucursales]: any = await db.execute('SELECT SC_IDSUCURSAL_PK FROM KS_SUCURSALES LIMIT 1');
  const sucursalId = sucursales[0]?.SC_IDSUCURSAL_PK || 1;

  // 2. Crear un vale de prueba con 2 cuotas
  const valeId = await createValeMutation({
    TR_IDTRABAJADOR_FK: worker.TR_IDTRABAJADOR_PK,
    SC_IDSUCURSAL_FK: sucursalId,
    VL_MONTO: 100000,
    VL_CUOTAS: 2,
    VL_FECHA_DESEMBOLSO: new Date().toISOString().split('T')[0],
    VL_FECHA_INICIO_COBRO: new Date().toISOString().split('T')[0],
    VL_OBSERVACIONES: 'VALE DE TEST AUTOMATIZADO'
  });
  console.log(`✅ Vale de prueba creado exitosamente (ID: ${valeId}, Monto: $100.000, 2 Cuotas).`);

  // Crear una nómina de prueba ficticia
  const [nominaResult]: any = await db.execute(
    `INSERT INTO KS_NOMINAS (NM_FECHA_INICIO, NM_FECHA_FIN, NM_ESTADO, NM_TIPO, NM_TOTAL_PAGADO) 
     VALUES (CURRENT_DATE - INTERVAL 7 DAY, CURRENT_DATE, 'PROCESANDO', 'TECNICO', 0)`
  );
  const nominaId = nominaResult.insertId;
  console.log(`📋 Nómina de prueba creada (ID: ${nominaId}).`);

  // Crear detalle de nómina ficticio para asociar al trabajador
  await db.execute(
    `INSERT INTO KS_NOMINA_DETALLES (NM_IDNOMINA_FK, TR_IDTRABAJADOR_FK, ND_BASE, ND_COMISIONES, ND_BONOS, ND_DEDUCCIONES_VALES, ND_TOTAL_NETO)
     VALUES (?, ?, 0, 0, 0, 50000, -50000)`,
    [nominaId, worker.TR_IDTRABAJADOR_PK]
  );

  try {
    // 3. Confirmar la nómina de prueba (Simulando descuento de la cuota 1)
    console.log('\n⚙️ Ejecutando "confirmarNomina" para la primera cuota...');
    const confirmRes = await confirmarNomina(nominaId);
    
    if (!confirmRes.success) {
      throw new Error(`confirmarNomina falló: ${confirmRes.error}`);
    }

    // Validar estado del vale
    const [valePostConfirm]: any = await db.execute(
      'SELECT VL_CUOTAS_PAGADAS, VL_ESTADO FROM KS_VALES WHERE VL_IDVALE_PK = ?',
      [valeId]
    );
    const { VL_CUOTAS_PAGADAS: pagadas1, VL_ESTADO: estado1 } = valePostConfirm[0];
    
    if (pagadas1 === 1 && estado1 === 'PENDIENTE') {
      console.log('   🎉 ÉXITO: El vale incrementó a 1 cuota pagada y se mantiene PENDIENTE.');
    } else {
      throw new Error(`Estado inesperado del vale tras confirmar: ${pagadas1} cuotas pagadas, estado: ${estado1}`);
    }

    // Validar registro en KS_NOMINA_VALES
    const [auditRows]: any = await db.execute(
      'SELECT NV_MONTO_DESCONTADO FROM KS_NOMINA_VALES WHERE NM_IDNOMINA_FK = ? AND VL_IDVALE_PK = ?',
      [nominaId, valeId]
    );
    
    if (auditRows.length === 1 && Number(auditRows[0].NV_MONTO_DESCONTADO) === 50000) {
      console.log('   🎉 ÉXITO: Se registró correctamente el descuento de $50.000 en la tabla de auditoría KS_NOMINA_VALES.');
    } else {
      throw new Error(`No se encontró registro de auditoría o el monto es incorrecto.`);
    }

    // 4. Desconfirmar la nómina de prueba (Simulando reversión de la cuota 1)
    console.log('\n⚙️ Ejecutando "desconfirmarNomina" (reversión del cobro)...');
    const revertRes = await desconfirmarNomina(nominaId);
    
    if (!revertRes.success) {
      throw new Error(`desconfirmarNomina falló: ${revertRes.error}`);
    }

    // Validar estado del vale post-reversión
    const [valePostRevert]: any = await db.execute(
      'SELECT VL_CUOTAS_PAGADAS, VL_ESTADO FROM KS_VALES WHERE VL_IDVALE_PK = ?',
      [valeId]
    );
    const { VL_CUOTAS_PAGADAS: pagadas2, VL_ESTADO: estado2 } = valePostRevert[0];
    
    if (pagadas2 === 0 && estado2 === 'PENDIENTE') {
      console.log('   🎉 ÉXITO: El vale se revirtió correctamente a 0 cuotas pagadas y estado PENDIENTE.');
    } else {
      throw new Error(`Fallo en la reversión: ${pagadas2} cuotas pagadas, estado: ${estado2}`);
    }

    console.log('\n⭐️ TODAS LAS PRUEBAS UNITARIAS PASARON CORRECTAMENTE (100% OK) ⭐️');

  } catch (error: any) {
    console.error(`\n❌ TEST FALLIDO: ${error.message}`);
  } finally {
    // 5. Limpieza de datos de prueba para mantener la DB limpia
    console.log('\n🧹 Limpiando registros de prueba...');
    await db.execute('DELETE FROM KS_NOMINA_VALES WHERE NM_IDNOMINA_FK = ?', [nominaId]);
    await db.execute('DELETE FROM KS_NOMINA_DETALLES WHERE NM_IDNOMINA_FK = ?', [nominaId]);
    await db.execute('DELETE FROM KS_NOMINAS WHERE NM_IDNOMINA_PK = ?', [nominaId]);
    await db.execute('DELETE FROM KS_VALES WHERE VL_IDVALE_PK = ?', [valeId]);
    console.log('🧹 Limpieza completada. Base de datos saneada.');
    
    db.end();
  }
}

runTests();
