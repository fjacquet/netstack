import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { FCConstraintViolation } from '@/domain/schemas/fc-bom'

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

interface FCViolationsPageProps {
  violations: FCConstraintViolation[]
}

function fcViolationTitle(v: FCConstraintViolation): string {
  switch (v.code) {
    case 'FC_PORT_SATURATION':
      return 'FC Port Saturation'
    case 'FC_OVERSUBSCRIPTION_EXCEEDED':
      return 'FC Oversubscription Exceeded'
    case 'FC_ISL_UNDERPROVISIONED':
      return 'FC ISL Underprovisioned'
    default:
      return 'FC Constraint Violation'
  }
}

function fcViolationBody(v: FCConstraintViolation): string {
  switch (v.code) {
    case 'FC_PORT_SATURATION':
      return `${v.requiredPorts} ports required but only ${v.availablePorts} available per switch after ISL reservation.`
    case 'FC_OVERSUBSCRIPTION_EXCEEDED':
      return `Fan-in ratio ${v.ratio}:1 exceeds maximum ${v.maxRatio}:1. Minimum ${v.minStoragePorts} storage ports needed.`
    case 'FC_ISL_UNDERPROVISIONED':
      return `${v.islsRequired} ISL ports required but only ${v.islsAvailable} available. Add switches or reduce ISL reservation.`
    default:
      return ''
  }
}

export function FCViolationsPage({ violations }: FCViolationsPageProps) {
  if (violations.length === 0) return null

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.heading}>FC Alerts</Text>
      {violations.map((v, i) => (
        <View key={i} style={styles.violationBlock}>
          <Text style={styles.violationTitle}>{fcViolationTitle(v)}</Text>
          <Text style={styles.violationBody}>{fcViolationBody(v)}</Text>
        </View>
      ))}
    </Page>
  )
}
