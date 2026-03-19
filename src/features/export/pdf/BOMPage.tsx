import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { NetworkBOM } from '@/domain/schemas/bom'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 12,
    backgroundColor: '#ffffff',
    color: '#111111',
  },
  heading: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 16,
    color: '#111111',
  },
  subheading: {
    fontSize: 14,
    fontWeight: 600,
    marginTop: 20,
    marginBottom: 8,
    color: '#333333',
  },
  table: {
    marginTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 2,
    borderBottomColor: '#dddddd',
    backgroundColor: '#f5f5f5',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  colModel: {
    width: '45%',
    paddingRight: 8,
  },
  colRole: {
    width: '35%',
    paddingRight: 8,
  },
  colQty: {
    width: '20%',
    textAlign: 'right',
  },
  headerText: {
    fontWeight: 600,
    color: '#444444',
  },
  oversubBlock: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#dddddd',
  },
  oversubLabel: {
    fontWeight: 600,
    color: '#333333',
    marginBottom: 4,
  },
  oversubValue: {
    fontSize: 14,
    color: '#111111',
  },
  oversubSeverity: {
    fontSize: 11,
    marginTop: 2,
  },
})

interface BOMPageProps {
  bom: NetworkBOM
}

function getOversubSeverity(ratio: number): { label: string; color: string } {
  if (ratio <= 3) return { label: 'Optimal (≤ 3:1)', color: '#16a34a' }
  if (ratio <= 6) return { label: 'Acceptable (≤ 6:1)', color: '#d97706' }
  return { label: 'Critical (> 6:1)', color: '#dc2626' }
}

export function BOMPage({ bom }: BOMPageProps) {
  const severity = getOversubSeverity(bom.oversubscriptionRatio)

  const switchRows: [string, string, number][] = [
    [bom.input.leafModel, 'Leaf (ToR)', bom.leafSwitches],
    ['S5232F-ON', 'Spine', bom.spineSwitches],
    ['S3248T-ON', 'OOB', bom.oobSwitches],
  ]

  const cableTypeLabel =
    bom.input.cableType === 'DAC' ? 'DAC' : bom.input.cableType === 'AOC' ? 'AOC' : 'Fiber'

  const cableRows: [string, string, number][] = [
    [`Leaf-Spine (${cableTypeLabel})`, 'Leaf-Spine', bom.leafSpineCables],
    [`Server-Leaf (${cableTypeLabel})`, 'Server-Leaf', bom.serverLeafCables],
    ['Server-OOB (RJ45)', 'Server-OOB', bom.serverOobCables],
    ['VLT Interconnect (QSFP28-DD)', 'VLT', bom.vltCables],
  ]

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.heading}>Bill of Materials</Text>

      {/* Oversubscription */}
      <View style={styles.oversubBlock}>
        <Text style={styles.oversubLabel}>Oversubscription Ratio</Text>
        <Text style={styles.oversubValue}>{bom.oversubscriptionRatio.toFixed(1)}:1</Text>
        <Text style={{ ...styles.oversubSeverity, color: severity.color }}>{severity.label}</Text>
      </View>

      {/* Switches */}
      <Text style={styles.subheading}>Switches</Text>
      <View style={styles.table}>
        <View style={styles.headerRow}>
          <Text style={{ ...styles.colModel, ...styles.headerText }}>Model</Text>
          <Text style={{ ...styles.colRole, ...styles.headerText }}>Role</Text>
          <Text style={{ ...styles.colQty, ...styles.headerText }}>Qty</Text>
        </View>
        {switchRows.map(([model, role, qty]) => (
          <View key={model} style={styles.row}>
            <Text style={styles.colModel}>{model}</Text>
            <Text style={styles.colRole}>{role}</Text>
            <Text style={styles.colQty}>{qty}</Text>
          </View>
        ))}
      </View>

      {/* Cables */}
      <Text style={styles.subheading}>Cables</Text>
      <View style={styles.table}>
        <View style={styles.headerRow}>
          <Text style={{ ...styles.colModel, ...styles.headerText }}>Type</Text>
          <Text style={{ ...styles.colRole, ...styles.headerText }}>Category</Text>
          <Text style={{ ...styles.colQty, ...styles.headerText }}>Qty</Text>
        </View>
        {cableRows.map(([type, category, qty]) => (
          <View key={type} style={styles.row}>
            <Text style={styles.colModel}>{type}</Text>
            <Text style={styles.colRole}>{category}</Text>
            <Text style={styles.colQty}>{qty}</Text>
          </View>
        ))}
        {bom.sfp28Count > 0 && (
          <View style={styles.row}>
            <Text style={styles.colModel}>SFP28 Transceiver</Text>
            <Text style={styles.colRole}>Server-Leaf</Text>
            <Text style={styles.colQty}>{bom.sfp28Count}</Text>
          </View>
        )}
        {bom.qsfp28Count > 0 && (
          <View style={styles.row}>
            <Text style={styles.colModel}>QSFP28 Transceiver</Text>
            <Text style={styles.colRole}>Leaf-Spine</Text>
            <Text style={styles.colQty}>{bom.qsfp28Count}</Text>
          </View>
        )}
      </View>

      {/* Cable Schedule (optional — only when bom.cableSchedule is present) */}
      {bom.cableSchedule && (
        <>
          <Text style={styles.subheading}>Cable Schedule</Text>
          <View style={styles.table}>
            <View style={styles.headerRow}>
              <Text style={{ ...styles.colModel, ...styles.headerText }}>Link Type</Text>
              <Text style={{ ...styles.colRole, ...styles.headerText }}>Qty</Text>
              <Text style={{ ...styles.colQty, ...styles.headerText }}>SKU</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.colModel}>Server-Leaf</Text>
              <Text style={styles.colRole}>{bom.serverLeafCables}</Text>
              <Text style={styles.colQty}>{bom.cableSchedule.serverLeafSkuM}m</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.colModel}>Leaf-Spine</Text>
              <Text style={styles.colRole}>{bom.leafSpineCables}</Text>
              <Text style={styles.colQty}>{bom.cableSchedule.leafSpineSkuM}m</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.colModel}>VLT</Text>
              <Text style={styles.colRole}>{bom.vltCables}</Text>
              <Text style={styles.colQty}>{bom.cableSchedule.vltSkuM}m</Text>
            </View>
          </View>
        </>
      )}
    </Page>
  )
}
