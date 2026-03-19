import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { ThreeTierBOM } from '@/domain/schemas/three-tier-bom'

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
  oversubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  oversubItem: {
    width: '48%',
  },
})

function getOversubSeverity(ratio: number): { label: string; color: string } {
  if (ratio <= 3) return { label: 'Optimal (3:1)', color: '#16a34a' }
  if (ratio <= 5) return { label: 'Acceptable (3-5:1)', color: '#d97706' }
  return { label: 'Critical (> 5:1)', color: '#dc2626' }
}

interface ThreeTierBOMPageProps {
  bom: ThreeTierBOM
}

export function ThreeTierBOMPage({ bom }: ThreeTierBOMPageProps) {
  const accessAggrSeverity = getOversubSeverity(bom.accessToAggrOversubscription)
  const aggrCoreSeverity = getOversubSeverity(bom.aggrToCoreOversubscription)

  const switchRows: [string, string, number][] = [
    [bom.input.accessModel, 'Access', bom.accessSwitches],
    [bom.input.aggregationModel, 'Aggregation', bom.aggregationSwitches],
    [bom.input.coreModel, 'Core', bom.coreSwitches],
    ['S3248T-ON', 'OOB', bom.oobSwitches],
  ]

  if (bom.borderLeafSwitches > 0) {
    switchRows.push([bom.input.borderLeafModel, 'Border Leaf', bom.borderLeafSwitches])
  }

  const cableTypeLabel =
    bom.input.cableType === 'DAC' ? 'DAC' : bom.input.cableType === 'AOC' ? 'AOC' : 'Fiber'

  const cableRows: [string, string, number][] = [
    [`Server-Access (${cableTypeLabel})`, 'Server-Access', bom.serverAccessCables],
    [`Access-Aggr (${cableTypeLabel})`, 'Access-Aggr', bom.accessAggrCables],
    [`Aggr-Core (${cableTypeLabel})`, 'Aggr-Core', bom.aggrCoreCables],
    ['Server-OOB (RJ45)', 'Server-OOB', bom.serverOobCables],
    ['VLT Interconnect (QSFP28-DD)', 'VLT', bom.vltCables],
  ]

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.heading}>Three-Tier Bill of Materials</Text>

      {/* Dual oversubscription ratios */}
      <View style={styles.oversubBlock}>
        <Text style={styles.oversubLabel}>Oversubscription Ratios</Text>
        <View style={styles.oversubRow}>
          <View style={styles.oversubItem}>
            <Text style={styles.oversubValue}>
              Access-Aggr: {bom.accessToAggrOversubscription.toFixed(1)}:1
            </Text>
            <Text style={{ ...styles.oversubSeverity, color: accessAggrSeverity.color }}>
              {accessAggrSeverity.label}
            </Text>
          </View>
          <View style={styles.oversubItem}>
            <Text style={styles.oversubValue}>
              Aggr-Core: {bom.aggrToCoreOversubscription.toFixed(1)}:1
            </Text>
            <Text style={{ ...styles.oversubSeverity, color: aggrCoreSeverity.color }}>
              {aggrCoreSeverity.label}
            </Text>
          </View>
        </View>
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
          <View key={`${model}-${role}`} style={styles.row}>
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
            <Text style={styles.colRole}>Server-Access</Text>
            <Text style={styles.colQty}>{bom.sfp28Count}</Text>
          </View>
        )}
        {bom.qsfp28Count > 0 && (
          <View style={styles.row}>
            <Text style={styles.colModel}>QSFP28 Transceiver</Text>
            <Text style={styles.colRole}>Inter-Tier</Text>
            <Text style={styles.colQty}>{bom.qsfp28Count}</Text>
          </View>
        )}
        {bom.qsfp56ddCount > 0 && (
          <View style={styles.row}>
            <Text style={styles.colModel}>QSFP56-DD Transceiver</Text>
            <Text style={styles.colRole}>Inter-Tier</Text>
            <Text style={styles.colQty}>{bom.qsfp56ddCount}</Text>
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
              <Text style={styles.colModel}>Server-Access</Text>
              <Text style={styles.colRole}>{bom.serverAccessCables}</Text>
              <Text style={styles.colQty}>{bom.cableSchedule.serverAccessSkuM}m</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.colModel}>Access-Aggr</Text>
              <Text style={styles.colRole}>{bom.accessAggrCables}</Text>
              <Text style={styles.colQty}>{bom.cableSchedule.accessAggregationSkuM}m</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.colModel}>Aggr-Core</Text>
              <Text style={styles.colRole}>{bom.aggrCoreCables}</Text>
              <Text style={styles.colQty}>{bom.cableSchedule.aggregationCoreSkuM}m</Text>
            </View>
          </View>
        </>
      )}
    </Page>
  )
}
