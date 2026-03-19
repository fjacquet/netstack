import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { ThreeTierConstraintViolation } from '@/domain/schemas/three-tier-bom'

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
  violationBlock: {
    padding: 12,
    marginBottom: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  violationTitle: {
    fontWeight: 600,
    fontSize: 13,
    color: '#92400e',
    marginBottom: 6,
  },
  violationBody: {
    fontSize: 11,
    color: '#78350f',
    lineHeight: 1.4,
  },
})

interface ThreeTierViolationsPageProps {
  violations: ThreeTierConstraintViolation[]
}

function violationTitle(v: ThreeTierConstraintViolation): string {
  switch (v.code) {
    case 'AGGREGATION_CAPACITY_EXCEEDED':
      return 'Aggregation Capacity Exceeded'
    case 'CORE_CAPACITY_EXCEEDED':
      return 'Core Capacity Exceeded'
    case 'OOB_PORT_SATURATION':
      return 'OOB Port Saturation'
    case 'DAC_DISTANCE_ADVISORY':
      return 'DAC Distance Advisory'
    case 'RACK_CAPACITY_EXCEEDED':
      return 'Rack Capacity Exceeded'
    default:
      return 'Constraint Violation'
  }
}

function violationBody(v: ThreeTierConstraintViolation): string {
  switch (v.code) {
    case 'AGGREGATION_CAPACITY_EXCEEDED':
      return `${v.accessUplinks} access-tier uplinks exceed the ${v.aggrDownlinks} available aggregation downlink ports. Add more aggregation switches or reduce access uplinks.`
    case 'CORE_CAPACITY_EXCEEDED':
      return `${v.aggrUplinks} aggregation-tier uplinks exceed the ${v.coreDownlinks} available core downlink ports. Add more core switches or reduce aggregation uplinks.`
    case 'OOB_PORT_SATURATION':
      return `${v.required} ports required but only ${v.available} available on one S3248T-ON. Add a second OOB switch or reduce servers per rack.`
    case 'DAC_DISTANCE_ADVISORY':
      return `DAC Distance Advisory: computed run ${v.computedDistanceM.toFixed(1)}m exceeds ${v.dacLimitM}m limit. Consider AOC or fiber.`
    case 'RACK_CAPACITY_EXCEEDED':
      return `Rack ${v.rackNumber} uses ${v.usedU}U of ${v.totalU}U capacity. Reduce servers per rack or use a taller rack.`
    default:
      return ''
  }
}

export function ThreeTierViolationsPage({ violations }: ThreeTierViolationsPageProps) {
  if (violations.length === 0) return null

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.heading}>Alerts</Text>
      {violations.map((v, i) => (
        <View key={i} style={styles.violationBlock}>
          <Text style={styles.violationTitle}>{violationTitle(v)}</Text>
          <Text style={styles.violationBody}>{violationBody(v)}</Text>
        </View>
      ))}
    </Page>
  )
}
