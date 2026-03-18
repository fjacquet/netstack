import { Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'

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
  diagram: {
    width: 515,
    marginTop: 8,
  },
  noImageBlock: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#dddddd',
    marginTop: 8,
  },
  noImageText: {
    color: '#777777',
    fontSize: 11,
    textAlign: 'center',
  },
})

interface FCTopologyPageProps {
  pngFabricA?: string
  pngFabricB?: string
}

export function FCTopologyPage({ pngFabricA, pngFabricB }: FCTopologyPageProps) {
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.heading}>FC Topology Diagrams</Text>

      {/* Fabric A */}
      <Text style={styles.subheading}>Fabric A</Text>
      {pngFabricA ? (
        <Image src={pngFabricA} style={styles.diagram} />
      ) : (
        <View style={styles.noImageBlock}>
          <Text style={styles.noImageText}>
            Fabric A diagram not available — open the FC Topology tab before exporting.
          </Text>
        </View>
      )}

      {/* Fabric B */}
      <Text style={styles.subheading}>Fabric B</Text>
      {pngFabricB ? (
        <Image src={pngFabricB} style={styles.diagram} />
      ) : (
        <View style={styles.noImageBlock}>
          <Text style={styles.noImageText}>
            Fabric B diagram not available — open the FC Topology tab before exporting.
          </Text>
        </View>
      )}
    </Page>
  )
}
