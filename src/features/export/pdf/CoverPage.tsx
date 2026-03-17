import { Page, View, Text, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 12,
    backgroundColor: '#ffffff',
    color: '#111111',
  },
  titleBlock: {
    marginTop: 120,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 600,
    color: '#111111',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#555555',
    marginBottom: 4,
  },
  rule: {
    borderBottomWidth: 2,
    borderBottomColor: '#dddddd',
    marginTop: 40,
  },
  date: {
    marginTop: 16,
    fontSize: 11,
    color: '#888888',
  },
})

interface CoverPageProps {
  generatedDate: string
}

export function CoverPage({ generatedDate }: CoverPageProps) {
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.titleBlock}>
        <Text style={styles.title}>NetStack</Text>
        <Text style={styles.subtitle}>Network Sizing Report</Text>
        <Text style={styles.subtitle}>Dell Leaf-Spine + OOB Infrastructure</Text>
      </View>
      <View style={styles.rule} />
      <Text style={styles.date}>Generated: {generatedDate}</Text>
    </Page>
  )
}
