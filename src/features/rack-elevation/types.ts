export type RackDevice = {
  id: string
  model: string
  role: 'leaf' | 'spine' | 'oob' | 'border'
  label: string
  uSlot: number
  usedPorts: number
  totalPorts: number
}
