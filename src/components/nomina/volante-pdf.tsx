import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Registrar fuentes para mejor estética
Font.register({
  family: 'Inter',
  src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf',
  fontWeight: 'normal'
});
Font.register({
  family: 'Inter',
  src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf',
  fontWeight: 'bold'
});

const styles = StyleSheet.create({
  page: { 
    padding: 40, 
    fontSize: 10, 
    fontFamily: 'Inter', 
    color: '#334155', // slate-700
    backgroundColor: '#FFFFFF'
  },
  
  // Header section
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9', // slate-100
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  logoContainer: {
    padding: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 8,
  },
  logo: { 
    width: 40, 
    height: 40,
    objectFit: 'contain'
  },
  companyName: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    textTransform: 'uppercase', 
    color: '#0F172A', // slate-900
    letterSpacing: -0.5
  },
  companySub: {
    fontSize: 7,
    color: '#94A3B8', // slate-400
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2
  },
  headerRight: {
    alignItems: 'flex-end'
  },
  voucherTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FF7E5F', // coral
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  voucherId: {
    fontSize: 8,
    color: '#94A3B8',
    marginTop: 2
  },

  // Info Grid
  infoGrid: { 
    flexDirection: 'row', 
    marginBottom: 30, 
    gap: 40
  },
  infoCol: { 
    flex: 1,
    gap: 8
  },
  infoRow: { 
    flexDirection: 'column',
    gap: 2
  },
  infoLabel: { 
    fontSize: 7, 
    color: '#94A3B8', 
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  infoValue: { 
    fontSize: 9, 
    fontWeight: 'bold',
    color: '#1E293B', // slate-800
    textTransform: 'uppercase'
  },

  // Sections
  section: { 
    marginBottom: 25 
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12
  },
  sectionTitle: { 
    fontSize: 8, 
    fontWeight: 'bold', 
    color: '#94A3B8', 
    textTransform: 'uppercase',
    letterSpacing: 1.5
  },

  // Table
  table: { 
    width: '100%',
  },
  tableHeader: { 
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 6,
    marginBottom: 6
  },
  headerText: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#94A3B8',
    textTransform: 'uppercase'
  },
  tableRow: { 
    flexDirection: 'row', 
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F8FAFC'
  },
  cellDesc: { 
    flex: 1, 
    fontSize: 9,
    color: '#475569' // slate-600
  },
  cellAmount: { 
    width: 100, 
    fontSize: 9, 
    textAlign: 'right',
    fontWeight: 'bold',
    color: '#1E293B'
  },

  // Totals
  subtotalRow: { 
    flexDirection: 'row', 
    marginTop: 10, 
    paddingTop: 10,
    borderTopWidth: 1.5,
    borderTopColor: '#F1F5F9'
  },
  subtotalLabel: { 
    flex: 1, 
    fontWeight: 'bold', 
    fontSize: 8,
    color: '#94A3B8',
    textTransform: 'uppercase'
  },
  subtotalAmount: { 
    width: 100, 
    fontWeight: 'bold', 
    fontSize: 9, 
    textAlign: 'right',
    color: '#1E293B'
  },

  // Neto Container (Dark like the web version)
  netoContainer: { 
    marginTop: 20, 
    padding: 15, 
    backgroundColor: '#0F172A', // slate-900
    borderRadius: 12,
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center'
  },
  netoLabel: { 
    fontSize: 9, 
    fontWeight: 'bold',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 2
  },
  netoValue: { 
    fontSize: 18, 
    fontWeight: 'bold',
    color: '#FFFFFF'
  },

  footer: { 
    position: 'absolute', 
    bottom: 40, 
    left: 40, 
    right: 40, 
    textAlign: 'center', 
    fontSize: 7, 
    color: '#94A3B8',
    borderTopWidth: 0.5,
    borderTopColor: '#F1F5F9',
    paddingTop: 15
  }
});

const fmt = (n: any) => {
  const val = Number(n) || 0;
  return new Intl.NumberFormat('es-CO', { 
    style: 'currency', 
    currency: 'COP', 
    maximumFractionDigits: 0 
  }).format(val);
};

export const VolantePDF = ({ data, logoUrl }: { data: any, logoUrl?: string }) => {
  const devengos = [
    { desc: 'Sueldo Base', val: Number(data.ND_BASE || 0) },
    { desc: 'Comisiones (SVC/PRD)', val: Number(data.ND_COMISIONES || 0) },
    { desc: 'Bonificaciones / Otros', val: Number(data.ND_BONOS || 0) },
  ].filter(i => i.val > 0);

  const deducciones = [
    { desc: 'Servicio Trabajador (Cuota)', val: Number(data.ND_DEDUCCIONES_SERVICIOS_TRABAJADOR || 0) },
    { desc: 'Vales (Cuota)', val: Number(data.ND_DEDUCCIONES_VALES || 0) },
  ].filter(i => i.val > 0);

  const totalDevengado = Number(data.ND_BASE || 0) + Number(data.ND_COMISIONES || 0) + Number(data.ND_BONOS || 0);
  const totalDeducido = Number(data.ND_DEDUCCIONES_SERVICIOS_TRABAJADOR || 0) + Number(data.ND_DEDUCCIONES_VALES || 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              {logoUrl ? (
                <Image src={logoUrl} style={styles.logo} />
              ) : (
                <View style={[styles.logo, { backgroundColor: '#F1F5F9' }]} />
              )}
            </View>
            <View>
              <Text style={styles.companyName}>kairos STYLOS</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.voucherTitle}>Comprobante de Nómina</Text>
            <Text style={styles.voucherId}>VP-{data.ND_IDDETALLE_PK?.toString().padStart(5, '0')}</Text>
          </View>
        </View>

        {/* Info Grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Colaborador</Text>
              <Text style={styles.infoValue}>{data.TR_NOMBRE}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Cargo</Text>
              <Text style={styles.infoValue}>{data.RL_NOMBRE || 'Colaborador'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sucursal</Text>
              <Text style={styles.infoValue}>{data.SC_NOMBRE || 'Principal'}</Text>
            </View>
          </View>
          <View style={styles.infoCol}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Periodo</Text>
              <Text style={styles.infoValue}>{data.periodoRange || '---'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ID Trabajador</Text>
              <Text style={styles.infoValue}>#{data.TR_IDTRABAJADOR_FK}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha Proceso</Text>
              <Text style={styles.infoValue}>{new Date().toLocaleDateString('es-CO')}</Text>
            </View>
          </View>
        </View>

        {/* Devengados */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Devengado</Text>
          </View>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.cellDesc}>Descripción</Text>
              <Text style={[styles.cellAmount, styles.headerText]}>Total</Text>
            </View>
            {devengos.map((item, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.cellDesc}>{item.desc}</Text>
                <Text style={styles.cellAmount}>{fmt(item.val)}</Text>
              </View>
            ))}
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Subtotal Devengado</Text>
              <Text style={styles.subtotalAmount}>{fmt(totalDevengado)}</Text>
            </View>
          </View>
        </View>

        {/* Deducciones */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Deducido</Text>
          </View>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.cellDesc}>Descripción</Text>
              <Text style={[styles.cellAmount, styles.headerText]}>Total</Text>
            </View>
            {deducciones.map((item, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.cellDesc}>{item.desc}</Text>
                <Text style={[styles.cellAmount, { color: '#DC2626' }]}>- {fmt(item.val)}</Text>
              </View>
            ))}
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Subtotal Deducciones</Text>
              <Text style={[styles.subtotalAmount, { color: '#DC2626' }]}>- {fmt(totalDeducido)}</Text>
            </View>
          </View>
        </View>

        {/* Neto Final */}
        <View style={styles.netoContainer}>
          <Text style={styles.netoLabel}>Neto Pagado</Text>
          <Text style={styles.netoValue}>{fmt(data.ND_TOTAL_NETO)}</Text>
        </View>

        <Text style={styles.footer}>
          Este documento es un comprobante informativo de liquidación de nómina generada por el sistema kairos STYLOS.
          {new Date().getFullYear()}
        </Text>
      </Page>
    </Document>
  );
};
