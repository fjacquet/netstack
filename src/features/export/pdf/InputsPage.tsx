import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { SizingInput } from '@/domain/schemas/input'

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
  table: {
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#dddddd',
    backgroundColor: '#f5f5f5',
  },
  col1: {
    width: '50%',
    paddingRight: 8,
    fontWeight: 600,
    color: '#444444',
  },
  col2: {
    width: '50%',
    color: '#111111',
  },
})

interface InputsPageProps {
  input: SizingInput
}

const cableTypeLabel: Record<string, string> = {
  DAC: 'DAC — Direct Attach Copper',
  AOC: 'AOC — Active Optical Cable',
  fiber: 'Fiber — LC/MPO',
}

export function InputsPage({ input }: InputsPageProps) {
  // RACK-03: Derive display values from racks array
  const totalServers = input.racks.reduce((sum, r) => sum + r.serverCount, 0)
  const rackCount = input.racks.length
  const maxServersPerRack = rackCount > 0 ? Math.max(...input.racks.map(r => r.serverCount)) : 0

  const rows: [string, string][] = [
    ['Rack Count', String(rackCount)],
    ['Total Servers', String(totalServers)],
    ['Max Servers per Rack', String(maxServersPerRack)],
    ['Rack Size', input.rackSize],
    ['Connectivity Type', input.connectivityType + ' SFP28'],
    ['Cable Type', cableTypeLabel[input.cableType] ?? input.cableType],
    ['Leaf Switch Model', input.leafModel],
  ]

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.heading}>Sizing Parameters</Text>
      <View style={styles.table}>
        <View style={styles.headerRow}>
          <Text style={styles.col1}>Parameter</Text>
          <Text style={styles.col2}>Value</Text>
        </View>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={styles.col1}>{label}</Text>
            <Text style={styles.col2}>{value}</Text>
          </View>
        ))}
      </View>
    </Page>
  )
}
