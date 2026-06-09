import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderBottom: '2 solid #FF7E5F', paddingBottom: 10 },
  logo: { width: 80, height: 80, objectFit: 'contain', marginRight: 15 },
  headerTextContainer: { flex: 1 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 4, color: '#1e293b' },
  subtitle: { fontSize: 12, marginBottom: 2, color: '#64748b' },
  
  section: { marginTop: 15, marginBottom: 15 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 10, backgroundColor: '#f8fafc', padding: 6, color: '#334155' },
  
  resumenRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f1f5f9', padding: 12, borderRadius: 5 },
  resumenBox: { flex: 1 },
  resumenBoxRight: { flex: 1, alignItems: 'flex-end' },
  resumenLabel: { fontSize: 10, color: '#64748b', marginBottom: 2, fontWeight: 'bold' },
  resumenValue: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  
  flujoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottom: '1 solid #f1f5f9' },
  flujoLabel: { color: '#475569', fontSize: 10 },
  flujoValue: { fontWeight: 'bold', color: '#0f172a', fontSize: 10 },
  flujoValuePositive: { fontWeight: 'bold', color: '#10b981', fontSize: 10 },
  flujoValueNegative: { fontWeight: 'bold', color: '#f43f5e', fontSize: 10 },
  flujoTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '2 solid #e2e8f0' },
  flujoTotalLabel: { fontSize: 12, fontWeight: 'bold', color: '#0f172a' },
  flujoTotalValue: { fontSize: 12, fontWeight: 'bold', color: '#10b981' },
  
  table: { display: 'flex', flexDirection: 'column', width: '100%', marginTop: 5 },
  tableRow: { flexDirection: 'row', borderBottom: '1 solid #e2e8f0', paddingVertical: 6, minHeight: 24, alignItems: 'center' },
  tableColTiny: { width: '8%', paddingRight: 4 },
  tableColSmall: { width: '15%', paddingRight: 4 },
  tableCol: { width: '20%', paddingRight: 4 },
  tableColWide: { width: '35%', paddingRight: 4 },
  tableCellHeader: { fontWeight: 'bold', color: '#475569', fontSize: 8, textTransform: 'uppercase' },
  tableCell: { color: '#334155', fontSize: 8 },
  
  pageNumber: { position: 'absolute', fontSize: 9, bottom: 20, left: 0, right: 0, textAlign: 'center', color: '#94a3b8' }
});

export const DailyReportDocument = ({
  sucursalName,
  dateStr,
  stats,
  chartsData,
  specificData,
  origin
}: any) => {
  const logoUrl = origin ? `${origin}/LOGO.png` : '/LOGO.png';

  const Header = () => (
    <View style={styles.header} fixed>
      <Image src={logoUrl} style={styles.logo} />
      <View style={styles.headerTextContainer}>
        <Text style={styles.title}>{sucursalName}</Text>
        <Text style={styles.subtitle}>INFORME DE CIERRE DIARIO DETALLADO</Text>
        <Text style={styles.subtitle}>FECHA: {dateStr}</Text>
      </View>
    </View>
  );

  return (
    <Document>
      {/* PÁGINA 1: RESUMEN Y FLUJO DE CAJA */}
      <Page size="A4" style={styles.page} wrap>
        <Header />
        
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Resumen General</Text>
          <View style={styles.resumenRow}>
            <View style={styles.resumenBox}>
              <Text style={styles.resumenLabel}>SERVICIOS REALIZADOS</Text>
              <Text style={styles.resumenValue}>{stats?.ventas_count || 0}</Text>
            </View>
            <View style={styles.resumenBoxRight}>
              <Text style={styles.resumenLabel}>TOTAL INGRESOS BRUTOS</Text>
              <Text style={styles.resumenValue}>$ {(stats?.ventas_total || 0).toLocaleString('es-CO')}</Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', marginTop: 15, marginBottom: 15 }} wrap={false}>
          {/* COLUMNA IZQUIERDA: FLUJO DE CAJA */}
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.sectionTitle}>Flujo de Caja del Día</Text>
            <View style={styles.flujoRow}>
              <Text style={styles.flujoLabel}>Venta Total</Text>
              <Text style={styles.flujoValue}>$ {(stats?.ventas_total || 0).toLocaleString('es-CO')}</Text>
            </View>
            <View style={styles.flujoRow}>
              <Text style={styles.flujoLabel}>Efectivo (Facturas)</Text>
              <Text style={styles.flujoValuePositive}>+ $ {(stats?.metodos_pago?.['EFECTIVO'] || 0).toLocaleString('es-CO')}</Text>
            </View>
            <View style={styles.flujoRow}>
              <Text style={styles.flujoLabel}>Efectivo (Abonos)</Text>
              <Text style={styles.flujoValuePositive}>+ $ {(stats?.total_abonos || 0).toLocaleString('es-CO')}</Text>
            </View>
            <View style={styles.flujoRow}>
              <Text style={styles.flujoLabel}>Transferencia</Text>
              <Text style={styles.flujoValue}>$ {(stats?.metodos_pago?.['TRANSFERENCIA'] || 0).toLocaleString('es-CO')}</Text>
            </View>
            <View style={styles.flujoRow}>
              <Text style={styles.flujoLabel}>Crédito</Text>
              <Text style={styles.flujoValue}>$ {(stats?.metodos_pago?.['CREDITO'] || 0).toLocaleString('es-CO')}</Text>
            </View>
            <View style={styles.flujoRow}>
              <Text style={styles.flujoLabel}>Servicio Trabajador</Text>
              <Text style={styles.flujoValue}>$ {(stats?.metodos_pago?.['SERVICIO DE TRABAJADOR'] || 0).toLocaleString('es-CO')}</Text>
            </View>
            <View style={styles.flujoRow}>
              <Text style={styles.flujoLabel}>Propina</Text>
              <Text style={styles.flujoValuePositive}>+ $ {(stats?.propinas_total || 0).toLocaleString('es-CO')}</Text>
            </View>
            <View style={styles.flujoRow}>
              <Text style={styles.flujoLabel}>Gastos</Text>
              <Text style={styles.flujoValueNegative}>- $ {(stats?.total_gastos || 0).toLocaleString('es-CO')}</Text>
            </View>
            <View style={styles.flujoRow}>
              <Text style={styles.flujoLabel}>Vales</Text>
              <Text style={styles.flujoValueNegative}>- $ {(stats?.vales_total || 0).toLocaleString('es-CO')}</Text>
            </View>
            <View style={styles.flujoTotalRow}>
              <Text style={styles.flujoTotalLabel}>EFECTIVO EN CAJA</Text>
              <Text style={styles.flujoTotalValue}>$ {(stats?.total_efectivo_en_caja || 0).toLocaleString('es-CO')}</Text>
            </View>
          </View>

          {/* LÍNEA SEPARADORA VERTICAL */}
          <View style={{ width: 1, backgroundColor: '#cbd5e1', marginHorizontal: 5 }} />

          {/* COLUMNA DERECHA: CANTIDADES */}
          <View style={{ flex: 1, paddingLeft: 10 }}>
            <Text style={styles.sectionTitle}>Resumen de Movimientos (Cant.)</Text>
            <View style={styles.flujoRow}>
              <Text style={styles.flujoLabel}>Clientes / Facturas</Text>
              <Text style={styles.flujoValue}>{specificData?.facturas?.length || 0}</Text>
            </View>
            <View style={styles.flujoRow}>
              <Text style={styles.flujoLabel}>Servicios Realizados</Text>
              <Text style={styles.flujoValue}>{specificData?.serviciosDetalle?.filter((s: any) => s.tipo_item === 'SERVICIO').reduce((acc: number, curr: any) => acc + curr.cantidad, 0) || 0}</Text>
            </View>
            <View style={styles.flujoRow}>
              <Text style={styles.flujoLabel}>Productos Utilizados</Text>
              <Text style={styles.flujoValue}>{specificData?.serviciosDetalle?.filter((s: any) => s.tipo_item === 'PRODUCTO').reduce((acc: number, curr: any) => acc + curr.cantidad, 0) || 0}</Text>
            </View>
            <View style={styles.flujoRow}>
              <Text style={styles.flujoLabel}>Pagos en Efectivo</Text>
              <Text style={styles.flujoValue}>{stats?.metodos_count?.['EFECTIVO'] || 0}</Text>
            </View>
            <View style={styles.flujoRow}>
              <Text style={styles.flujoLabel}>Abonos Recibidos</Text>
              <Text style={styles.flujoValue}>{stats?.abonos_count || 0}</Text>
            </View>
            <View style={styles.flujoRow}>
              <Text style={styles.flujoLabel}>Pagos por Transferencia</Text>
              <Text style={styles.flujoValue}>{stats?.metodos_count?.['TRANSFERENCIA'] || 0}</Text>
            </View>
            <View style={styles.flujoRow}>
              <Text style={styles.flujoLabel}>Pagos con Crédito</Text>
              <Text style={styles.flujoValue}>{stats?.metodos_count?.['CREDITO'] || 0}</Text>
            </View>
            <View style={styles.flujoRow}>
              <Text style={styles.flujoLabel}>Servicios Trabajador</Text>
              <Text style={styles.flujoValue}>{stats?.metodos_count?.['SERVICIO DE TRABAJADOR'] || 0}</Text>
            </View>
            <View style={styles.flujoRow}>
              <Text style={styles.flujoLabel}>Propinas</Text>
              <Text style={styles.flujoValue}>{stats?.propinas_count || 0}</Text>
            </View>
            <View style={styles.flujoRow}>
              <Text style={styles.flujoLabel}>Gastos</Text>
              <Text style={styles.flujoValue}>{stats?.gastos_count || 0}</Text>
            </View>
            <View style={styles.flujoRow}>
              <Text style={styles.flujoLabel}>Vales Entregados</Text>
              <Text style={styles.flujoValue}>{stats?.vales_count || 0}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (`Página ${pageNumber} de ${totalPages}`)} fixed />
      </Page>

      {/* PÁGINA 2: COMISIONES TÉCNICOS */}
      <Page size="A4" style={styles.page} wrap>
        <Header />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Liquidación / Comisión de Técnicos</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={styles.tableColWide}><Text style={styles.tableCellHeader}>Técnico</Text></View>
              <View style={styles.tableColSmall}><Text style={styles.tableCellHeader}>Cant. Serv.</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCellHeader}>Prod. de Serv.</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCellHeader}>Prod. de Prod.</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCellHeader}>A Pagar</Text></View>
            </View>
            {chartsData?.topTechs?.length > 0 ? (
              chartsData.topTechs.map((t: any, i: number) => (
                <View style={styles.tableRow} key={i}>
                  <View style={styles.tableColWide}><Text style={styles.tableCell}>{t.name}</Text></View>
                  <View style={styles.tableColSmall}><Text style={styles.tableCell}>{t.count}</Text></View>
                  <View style={styles.tableCol}><Text style={styles.tableCell}>$ {Number(t.total_servicios || 0).toLocaleString('es-CO')}</Text></View>
                  <View style={styles.tableCol}><Text style={styles.tableCell}>$ {Number(t.total_productos || 0).toLocaleString('es-CO')}</Text></View>
                  <View style={styles.tableCol}><Text style={styles.tableCell}>$ {Number(t.total_pagar || 0).toLocaleString('es-CO')}</Text></View>
                </View>
              ))
            ) : (
               <View style={styles.tableRow}><Text style={styles.tableCell}>No hay comisiones registradas en el día.</Text></View>
            )}
          </View>
        </View>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (`Página ${pageNumber} de ${totalPages}`)} fixed />
      </Page>

      {/* PÁGINA 3: DETALLE DE GASTOS */}
      <Page size="A4" style={styles.page} wrap>
        <Header />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalle de Gastos</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={styles.tableCol}><Text style={styles.tableCellHeader}>Categoría</Text></View>
              <View style={styles.tableColWide}><Text style={styles.tableCellHeader}>Descripción</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCellHeader}>Valor</Text></View>
            </View>
            {specificData?.gastos?.length > 0 ? (
              specificData.gastos.map((g: any, i: number) => (
                <View style={styles.tableRow} key={i}>
                  <View style={styles.tableCol}><Text style={styles.tableCell}>{g.GS_CATEGORIA || g.GT_CATEGORIA || 'Gasto'}</Text></View>
                  <View style={styles.tableColWide}><Text style={styles.tableCell}>{g.GS_DESCRIPCION || g.GT_DESCRIPCION || 'Gasto'}</Text></View>
                  <View style={styles.tableCol}><Text style={styles.tableCell}>$ {Number(g.GS_VALOR || g.GT_VALOR || 0).toLocaleString('es-CO')}</Text></View>
                </View>
              ))
            ) : (
               <View style={styles.tableRow}><Text style={styles.tableCell}>No hay gastos registrados en el día.</Text></View>
            )}
          </View>
        </View>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (`Página ${pageNumber} de ${totalPages}`)} fixed />
      </Page>

      {/* PÁGINA 4: DETALLE DE ÍTEMS REALIZADOS (SERVICIOS Y PRODUCTOS) */}
      <Page size="A4" style={styles.page} wrap>
        <Header />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Servicios y Productos Despachados</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={styles.tableColTiny}><Text style={styles.tableCellHeader}>Factura</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCellHeader}>Técnico</Text></View>
              <View style={styles.tableColWide}><Text style={styles.tableCellHeader}>Ítem (Servicio / Producto)</Text></View>
              <View style={styles.tableColTiny}><Text style={styles.tableCellHeader}>Cant.</Text></View>
              <View style={styles.tableColSmall}><Text style={styles.tableCellHeader}>Valor Total</Text></View>
              <View style={styles.tableColSmall}><Text style={styles.tableCellHeader}>Comisión</Text></View>
            </View>
            {specificData?.serviciosDetalle?.length > 0 ? (
              specificData.serviciosDetalle.map((s: any, i: number) => (
                <View style={styles.tableRow} key={i}>
                  <View style={styles.tableColTiny}><Text style={styles.tableCell}>{s.FC_NUMERO_FACTURA || s.FC_IDFACTURA_PK}</Text></View>
                  <View style={styles.tableCol}><Text style={styles.tableCell}>{s.tecnico_nombre || 'N/A'}</Text></View>
                  <View style={styles.tableColWide}>
                    <Text style={styles.tableCell}>
                      {s.tipo_item === 'PRODUCTO' ? '[PROD] ' : '[SERV] '} {s.item_nombre}
                    </Text>
                  </View>
                  <View style={styles.tableColTiny}><Text style={styles.tableCell}>{s.cantidad}</Text></View>
                  <View style={styles.tableColSmall}><Text style={styles.tableCell}>$ {Number(s.valor_total || 0).toLocaleString('es-CO')}</Text></View>
                  <View style={styles.tableColSmall}><Text style={styles.tableCell}>$ {Number(s.comision || 0).toLocaleString('es-CO')}</Text></View>
                </View>
              ))
            ) : (
               <View style={styles.tableRow}><Text style={styles.tableCell}>No hay ítems registrados.</Text></View>
            )}
          </View>
        </View>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (`Página ${pageNumber} de ${totalPages}`)} fixed />
      </Page>

      {/* PÁGINA 5: FACTURAS GENERADAS */}
      <Page size="A4" style={styles.page} wrap>
        <Header />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Facturas Generadas</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={styles.tableColSmall}><Text style={styles.tableCellHeader}># Factura</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCellHeader}>Cliente</Text></View>
              <View style={styles.tableColWide}><Text style={styles.tableCellHeader}>Técnicos Involucrados</Text></View>
              <View style={styles.tableColSmall}><Text style={styles.tableCellHeader}>Total</Text></View>
            </View>
            {specificData?.facturas?.length > 0 ? (
              specificData.facturas.map((f: any, i: number) => (
                <View style={styles.tableRow} key={i}>
                  <View style={styles.tableColSmall}><Text style={styles.tableCell}>{f.FC_NUMERO_FACTURA || f.FC_CONSECUTIVO || f.FC_IDFACTURA_PK}</Text></View>
                  <View style={styles.tableCol}><Text style={styles.tableCell}>{f.CL_NOMBRE || f.cliente_display || 'Cliente General'}</Text></View>
                  <View style={styles.tableColWide}><Text style={styles.tableCell}>{f.tecnicos || 'N/A'}</Text></View>
                  <View style={styles.tableColSmall}><Text style={styles.tableCell}>$ {Number(f.FC_TOTAL || 0).toLocaleString('es-CO')}</Text></View>
                </View>
              ))
            ) : (
               <View style={styles.tableRow}><Text style={styles.tableCell}>No hay facturas registradas.</Text></View>
            )}
          </View>
        </View>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (`Página ${pageNumber} de ${totalPages}`)} fixed />
      </Page>
    </Document>
  );
};
