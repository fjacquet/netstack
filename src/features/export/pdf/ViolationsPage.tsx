import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { ConstraintViolation } from '@/domain/schemas/bom'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Inter',
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

interface ViolationsPageProps {
  violations: ConstraintViolation[]
}

function violationTitle(v: ConstraintViolation): string {
  switch (v.code) {
    case 'OOB_PORT_SATURATION':
      return 'OOB Port Saturation'
    case 'SPINE_CAPACITY_EXCEEDED':
      return 'Spine Capacity Exceeded'
    case 'DAC_DISTANCE_ADVISORY':
      return 'DAC Distance Advisory'
    default:
      return 'Constraint Violation'
  }
}

function violationBody(v: ConstraintViolation): string {
  switch (v.code) {
    case 'OOB_PORT_SATURATION':
      return `${v.required} ports required but only ${v.available} available on one S3248T-ON. Add a second OOB switch or reduce servers per rack.`
    case 'SPINE_CAPACITY_EXCEEDED':
      return `${v.leafCount} leaf switches exceed the ${v.maxLeafs}-port capacity of the spine tier. Scale out spine switches or segment into multiple pods.`
    case 'DAC_DISTANCE_ADVISORY':
      return `DAC cables are limited to 3m. With ${v.rackCount} racks, verify all leaf-to-spine runs are within spec. Consider AOC or fiber for longer distances.`
    default:
      return ''
  }
}

export function ViolationsPage({ violations }: ViolationsPageProps) {
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
