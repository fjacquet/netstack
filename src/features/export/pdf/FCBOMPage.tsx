import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { FCNetworkBOM } from '@/domain/schemas/fc-bom'

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
  portBlock: {
    marginTop: 16,
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#dddddd',
  },
  portRow: {
    flexDirection: 'row',
    paddingVertical: 3,
  },
  portLabel: {
    width: '60%',
    color: '#444444',
    fontWeight: 600,
  },
  portValue: {
    width: '40%',
    color: '#111111',
    textAlign: 'right',
  },
})

interface FCBOMPageProps {
  bom: FCNetworkBOM
}

function getFCSeverity(ratio: number): { label: string; color: string } {
  if (ratio <= 7) return { label: 'Optimal (≤ 7:1)', color: '#16a34a' }
  if (ratio <= 10) return { label: 'Acceptable (≤ 10:1)', color: '#d97706' }
  return { label: 'Critical (> 10:1)', color: '#dc2626' }
}

export function FCBOMPage({ bom }: FCBOMPageProps) {
  const severity = getFCSeverity(bom.fanInRatio)

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.heading}>FC Bill of Materials</Text>

      {/* Fan-in Oversubscription */}
      <View style={styles.oversubBlock}>
        <Text style={styles.oversubLabel}>Fan-in Oversubscription Ratio</Text>
        <Text style={styles.oversubValue}>{bom.fanInRatio.toFixed(1)}:1</Text>
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
        <View style={styles.row}>
          <Text style={styles.colModel}>{bom.input.fcSwitchModel}</Text>
          <Text style={styles.colRole}>Fabric A</Text>
          <Text style={styles.colQty}>{bom.fabricASwitches}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.colModel}>{bom.input.fcSwitchModel}</Text>
          <Text style={styles.colRole}>Fabric B</Text>
          <Text style={styles.colQty}>{bom.fabricBSwitches}</Text>
        </View>
      </View>

      {/* Optics & Cables */}
      <Text style={styles.subheading}>Optics &amp; Cables</Text>
      <View style={styles.table}>
        <View style={styles.headerRow}>
          <Text style={{ ...styles.colModel, ...styles.headerText }}>Type</Text>
          <Text style={{ ...styles.colRole, ...styles.headerText }}>Category</Text>
          <Text style={{ ...styles.colQty, ...styles.headerText }}>Qty</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.colModel}>FC SFP Optics</Text>
          <Text style={styles.colRole}>Host/ISL</Text>
          <Text style={styles.colQty}>{bom.fcOpticsCount}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.colModel}>ISL Cable</Text>
          <Text style={styles.colRole}>Inter-Switch Link</Text>
          <Text style={styles.colQty}>{bom.islCables}</Text>
        </View>
      </View>

      {/* POD Licenses (conditional) */}
      {bom.podLicensesRequired > 0 && (
        <>
          <Text style={styles.subheading}>POD Licenses</Text>
          <View style={styles.table}>
            <View style={styles.headerRow}>
              <Text style={{ ...styles.colModel, ...styles.headerText }}>Type</Text>
              <Text style={{ ...styles.colRole, ...styles.headerText }}>Category</Text>
              <Text style={{ ...styles.colQty, ...styles.headerText }}>Qty</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.colModel}>POD License Unit</Text>
              <Text style={styles.colRole}>Port-on-Demand</Text>
              <Text style={styles.colQty}>{bom.podLicensesRequired}</Text>
            </View>
          </View>
        </>
      )}

      {/* Port Utilization */}
      <View style={styles.portBlock}>
        <View style={styles.portRow}>
          <Text style={styles.portLabel}>Host Ports per Fabric:</Text>
          <Text style={styles.portValue}>{bom.hostPortsPerFabric}</Text>
        </View>
        <View style={styles.portRow}>
          <Text style={styles.portLabel}>Storage Ports per Fabric:</Text>
          <Text style={styles.portValue}>{bom.storagePortsPerFabric}</Text>
        </View>
        <View style={styles.portRow}>
          <Text style={styles.portLabel}>ISL Ports per Fabric:</Text>
          <Text style={styles.portValue}>{bom.islPortsPerFabric}</Text>
        </View>
        <View style={styles.portRow}>
          <Text style={styles.portLabel}>Switch Capacity per Fabric:</Text>
          <Text style={styles.portValue}>{bom.switchPortsPerFabric} ports</Text>
        </View>
      </View>
    </Page>
  )
}
