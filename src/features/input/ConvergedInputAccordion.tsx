import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/shallow'
import { useConvergedInputStore } from '@/store/convergedInputStore'
import { SWITCH_CATALOG } from '@/domain/catalog/hardware'
import { FC_SWITCH_CATALOG } from '@/domain/catalog/brocade'
import type { ConvergedSizingInput } from '@/domain/schemas/converged-input'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'

const LEAF_MODELS = ['S5248F-ON', 'S5224F-ON', 'S5212F-ON', 'S5296F-ON'] as const
const SPINE_MODELS = ['S5232F-ON'] as const
const ACCESS_MODELS = ['S5248F-ON', 'S5224F-ON', 'S5212F-ON', 'S5296F-ON', 'Z9264F-ON'] as const
const AGGREGATION_MODELS = ['Z9264F-ON', 'Z9332F-ON', 'Z9432F-ON', 'S5232F-ON'] as const
const CORE_MODELS = ['Z9332F-ON', 'Z9432F-ON'] as const
const BORDER_LEAF_OPTIONS = ['none', 'S5248F-ON', 'S5224F-ON', 'S5212F-ON', 'S5296F-ON'] as const
const RACK_SIZES = ['24U', '42U', '50U'] as const
const SERVER_U_HEIGHTS = ['1U', '2U', '4U', '8U'] as const

const U_HEIGHT_LABELS: Record<string, string> = {
  '1U': 'sizing.uHeight1U',
  '2U': 'sizing.uHeight2U',
  '4U': 'sizing.uHeight4U',
  '8U': 'sizing.uHeight8U',
}

const GENERATION_OPTIONS = ['any', 'gen7', 'gen8'] as const
type PreferredGeneration = (typeof GENERATION_OPTIONS)[number]

const GENERATION_LABELS: Record<PreferredGeneration, string> = {
  any: 'fc.genAny',
  gen7: 'fc.gen7',
  gen8: 'fc.gen8',
}

type FCSwitchModelId = keyof typeof FC_SWITCH_CATALOG

interface ConvergedFormValues {
  topology: 'leaf-spine' | 'three-tier'
  rackCount: number
  rackServers: number[]
  // Ethernet leaf-spine fields
  portsPerServerFrontend: number
  portsPerServerBackend: number
  activeUplinksPerLeaf: number
  connectivityType: '25G' | '100G'
  cableType: 'DAC' | 'AOC' | 'fiber'
  leafModel: 'S5248F-ON' | 'S5224F-ON' | 'S5212F-ON' | 'S5296F-ON'
  spineModel: 'S5232F-ON'
  borderLeafModel: 'S5248F-ON' | 'S5224F-ON' | 'S5212F-ON' | 'S5296F-ON' | 'none'
  borderLeafCount: number
  // Three-tier fields
  accessModel: 'S5248F-ON' | 'S5224F-ON' | 'S5212F-ON' | 'S5296F-ON' | 'Z9264F-ON'
  aggregationModel: 'Z9264F-ON' | 'Z9332F-ON' | 'Z9432F-ON' | 'S5232F-ON'
  activeUplinksPerAggregation: number
  coreModel: 'Z9332F-ON' | 'Z9432F-ON'
  // FC fields
  hbaPortsPerServer: number
  storageTargetPorts: number
  storageArrayCount: number
  fcSwitchModel: FCSwitchModelId
  islPortsPerSwitch: number
  preferredGeneration: PreferredGeneration
  // Physical fields
  rackSize: '24U' | '42U' | '50U'
  serverUHeight: '1U' | '2U' | '4U' | '8U'
  switchPositioning: 'ToR' | 'MoR' | 'BoR'
  // Brownfield
  existingSpinesDeployed: boolean
  existingCoreDeployed: boolean
}

export function ConvergedInputAccordion() {
  const { t } = useTranslation()
  const { input, setInput } = useConvergedInputStore(
    useShallow((s) => ({ input: s.input, setInput: s.setInput }))
  )

  const form = useForm<ConvergedFormValues>({
    defaultValues: {
      topology: input.topology,
      rackCount: input.racks.length,
      rackServers: input.racks.map((r) => r.serverCount),
      portsPerServerFrontend: input.portsPerServerFrontend,
      portsPerServerBackend: input.portsPerServerBackend,
      activeUplinksPerLeaf: input.activeUplinksPerLeaf,
      connectivityType: input.connectivityType,
      cableType: input.cableType,
      leafModel: input.leafModel,
      spineModel: input.spineModel,
      borderLeafModel: input.borderLeafModel,
      borderLeafCount: input.borderLeafCount,
      accessModel: input.accessModel,
      aggregationModel: input.aggregationModel,
      activeUplinksPerAggregation: input.activeUplinksPerAggregation,
      coreModel: input.coreModel,
      hbaPortsPerServer: input.hbaPortsPerServer,
      storageTargetPorts: input.storageTargetPorts,
      storageArrayCount: input.storageArrayCount,
      fcSwitchModel: input.fcSwitchModel,
      islPortsPerSwitch: input.islPortsPerSwitch,
      preferredGeneration: input.preferredGeneration,
      rackSize: input.rackSize,
      serverUHeight: input.serverUHeight,
      switchPositioning: input.switchPositioning,
      existingSpinesDeployed: input.existingSpinesDeployed,
      existingCoreDeployed: input.existingCoreDeployed,
    },
    mode: 'onChange',
  })

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Watch leafModel to derive max uplinks and clamp activeUplinksPerLeaf
  const currentLeafModel = form.watch('leafModel')
  const maxUplinks = SWITCH_CATALOG[currentLeafModel]?.uplinkPorts ?? 4

  useEffect(() => {
    const currentUplinks = form.getValues('activeUplinksPerLeaf')
    if (currentUplinks > maxUplinks) {
      form.setValue('activeUplinksPerLeaf', maxUplinks)
      setInput({ activeUplinksPerLeaf: maxUplinks })
    }
  }, [currentLeafModel, maxUplinks, form, setInput])

  // FC generation filtering
  const watchedGeneration = (form.watch('preferredGeneration') as PreferredGeneration) ?? 'any'
  const filteredFCModels: FCSwitchModelId[] =
    watchedGeneration === 'any'
      ? (Object.keys(FC_SWITCH_CATALOG) as FCSwitchModelId[])
      : (Object.keys(FC_SWITCH_CATALOG) as FCSwitchModelId[]).filter((m) => {
          const gen = FC_SWITCH_CATALOG[m].generation
          return watchedGeneration === 'gen7' ? gen === 7 : gen === 8
        })

  useEffect(() => {
    const subscription = form.watch((values, { name }) => {
      const v = values as Partial<ConvergedFormValues>

      if (name === 'rackCount') {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          const newCount = Math.max(1, Math.min(200, Number(v.rackCount ?? 1)))
          const currentServers = form.getValues('rackServers') ?? []
          let newServers: number[]
          if (newCount > currentServers.length) {
            newServers = [
              ...currentServers,
              ...Array(newCount - currentServers.length).fill(16),
            ]
          } else {
            newServers = currentServers.slice(0, newCount)
          }
          form.setValue('rackServers', newServers)
          setInput({ racks: newServers.map((serverCount) => ({ serverCount })) })
        }, 150)
        return
      }

      if (name?.startsWith('rackServers.')) {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          const servers = form.getValues('rackServers') ?? []
          setInput({ racks: servers.map((serverCount) => ({ serverCount: Number(serverCount) || 0 })) })
        }, 150)
        return
      }

      if (
        name === 'portsPerServerFrontend' ||
        name === 'portsPerServerBackend' ||
        name === 'activeUplinksPerLeaf' ||
        name === 'activeUplinksPerAggregation' ||
        name === 'hbaPortsPerServer' ||
        name === 'storageTargetPorts' ||
        name === 'storageArrayCount' ||
        name === 'islPortsPerSwitch' ||
        name === 'borderLeafCount'
      ) {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          const numVal = Number(v[name as keyof ConvergedFormValues])
          if (!isNaN(numVal)) {
            setInput({ [name]: numVal } as Partial<ConvergedSizingInput>)
          }
        }, 150)
        return
      }

      // Select inputs: immediate update
      const {
        rackCount: _rc,
        rackServers: _rs,
        portsPerServerFrontend: _pf,
        portsPerServerBackend: _pb,
        activeUplinksPerLeaf: _au,
        activeUplinksPerAggregation: _uag,
        hbaPortsPerServer: _hba,
        storageTargetPorts: _stp,
        storageArrayCount: _sac,
        islPortsPerSwitch: _isl,
        borderLeafCount: _blc,
        ...rest
      } = v as ConvergedFormValues
      const validRest = Object.fromEntries(
        Object.entries(rest).filter(([, val]) => val !== undefined && val !== null && String(val) !== '')
      )
      if (Object.keys(validRest).length > 0) {
        setInput(validRest as Partial<ConvergedSizingInput>)
      }
    })

    return () => {
      subscription.unsubscribe()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [form, setInput])

  const watchedRackServers = form.watch('rackServers') ?? []
  const totalServers = watchedRackServers.reduce((sum, c) => sum + (Number(c) || 0), 0)
  const currentTopology = form.watch('topology')

  return (
    <Form {...form}>
      <form>
        <Accordion type="single" collapsible defaultValue="rack-config" className="w-full">

          {/* === Section 1: Rack Configuration === */}
          <AccordionItem value="rack-config">
            <AccordionTrigger className="text-base font-semibold px-6 py-4">
              {t('input.section.rackConfig')}
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-4">
                {/* Rack Count */}
                <FormField
                  control={form.control}
                  name="rackCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-muted-foreground">{t('sizing.rackCount')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={200}
                          data-testid="rack-count"
                          {...field}
                          onChange={(e) => {
                            const val = e.target.value
                            field.onChange(val === '' ? '' : Number(val))
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Topology Selector */}
                <FormField
                  control={form.control}
                  name="topology"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-muted-foreground">{t('converged.topologySelector')}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="topology-selector">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="leaf-spine">{t('converged.topologyLeafSpine')}</SelectItem>
                          <SelectItem value="three-tier">{t('converged.topologyThreeTier')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Per-rack server count inputs */}
                <div className={watchedRackServers.length > 4 ? 'max-h-48 overflow-y-auto space-y-2' : 'space-y-2'}>
                  {watchedRackServers.map((_, i) => (
                    <FormField
                      key={i}
                      control={form.control}
                      name={`rackServers.${i}` as `rackServers.${number}`}
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-2">
                            <FormLabel className="w-16 shrink-0 text-xs text-muted-foreground">
                              {t('sizing.rackLabel', { n: i + 1 })}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                max={500}
                                data-testid={`rack-server-${i}`}
                                {...field}
                                onChange={(e) => {
                                  const val = e.target.value
                                  field.onChange(val === '' ? '' : Number(val))
                                }}
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>

                {/* Total server count summary */}
                <p className="text-xs text-muted-foreground">
                  {t('sizing.totalServersDisplay', { count: totalServers })}
                </p>

                {/* Server U-Height */}
                <FormField
                  control={form.control}
                  name="serverUHeight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-muted-foreground">{t('sizing.serverUHeight')}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('sizing.selectServerUHeight')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SERVER_U_HEIGHTS.map((size) => (
                            <SelectItem key={size} value={size}>{t(U_HEIGHT_LABELS[size])}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Rack Size */}
                <FormField
                  control={form.control}
                  name="rackSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-muted-foreground">{t('sizing.rackSize')}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('sizing.selectRackSize')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {RACK_SIZES.map((size) => (
                            <SelectItem key={size} value={size}>{size}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* === Section 2: Ethernet Switches === */}
          <AccordionItem value="ethernet-switches">
            <AccordionTrigger className="text-base font-semibold px-6 py-4">
              {t('input.section.ethernetSwitches')}
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Connectivity Type */}
                <FormField
                  control={form.control}
                  name="connectivityType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-muted-foreground">{t('sizing.connectivityType')}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('sizing.selectConnectivity')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="25G">{t('sizing.connectivity25G')}</SelectItem>
                          <SelectItem value="100G">{t('sizing.connectivity100G')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Cable Type */}
                <FormField
                  control={form.control}
                  name="cableType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-muted-foreground">{t('sizing.cableType')}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('sizing.selectCable')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="DAC">{t('sizing.cableDAC')}</SelectItem>
                          <SelectItem value="AOC">{t('sizing.cableAOC')}</SelectItem>
                          <SelectItem value="fiber">{t('sizing.cableFiber')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* === Leaf-Spine fields === */}
                {currentTopology === 'leaf-spine' && (
                  <>
                    {/* Leaf Switch Model */}
                    <FormField
                      control={form.control}
                      name="leafModel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm text-muted-foreground">{t('sizing.leafModel')}</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('sizing.selectLeafModel')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {LEAF_MODELS.map((model) => (
                                <SelectItem key={model} value={model}>{model}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Active Uplinks per Leaf */}
                    <FormField
                      control={form.control}
                      name="activeUplinksPerLeaf"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm text-muted-foreground">{t('sizing.activeUplinksPerLeaf')}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={maxUplinks}
                              data-testid="active-uplinks"
                              {...field}
                              onChange={(e) => {
                                const val = e.target.value
                                field.onChange(val === '' ? '' : Number(val))
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            {t('sizing.activeUplinksHelp', { max: maxUplinks, model: currentLeafModel })}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Spine Switch Model */}
                    <FormField
                      control={form.control}
                      name="spineModel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm text-muted-foreground">{t('sizing.spineModel')}</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('sizing.selectSpineModel')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {SPINE_MODELS.map((model) => (
                                <SelectItem key={model} value={model}>{model}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Border Leaf Model (Clos only) */}
                    <FormField
                      control={form.control}
                      name="borderLeafModel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm text-muted-foreground">{t('sizing.borderLeafModel')}</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('sizing.selectBorderLeaf')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {BORDER_LEAF_OPTIONS.map((model) => (
                                <SelectItem key={model} value={model}>
                                  {model === 'none' ? t('sizing.borderLeafNone') : model}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Border Leaf Count (Clos only) */}
                    <FormField
                      control={form.control}
                      name="borderLeafCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm text-muted-foreground">{t('sizing.borderLeafCount')}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              max={4}
                              disabled={form.watch('borderLeafModel') === 'none'}
                              {...field}
                              onChange={(e) => {
                                const val = e.target.value
                                field.onChange(val === '' ? '' : Number(val))
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* === Three-Tier fields === */}
                {currentTopology === 'three-tier' && (
                  <>
                    {/* Access Switch Model */}
                    <FormField
                      control={form.control}
                      name="accessModel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm text-muted-foreground">{t('threeTier.accessModel')}</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ACCESS_MODELS.map((model) => (
                                <SelectItem key={model} value={model}>{model}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Active Uplinks per Access (reuses activeUplinksPerLeaf store field) */}
                    <FormField
                      control={form.control}
                      name="activeUplinksPerLeaf"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm text-muted-foreground">{t('threeTier.activeUplinksPerAccess')}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={64}
                              data-testid="active-uplinks-access"
                              {...field}
                              onChange={(e) => {
                                const val = e.target.value
                                field.onChange(val === '' ? '' : Number(val))
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Aggregation Switch Model */}
                    <FormField
                      control={form.control}
                      name="aggregationModel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm text-muted-foreground">{t('threeTier.aggregationModel')}</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {AGGREGATION_MODELS.map((model) => (
                                <SelectItem key={model} value={model}>{model}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Active Uplinks per Aggregation */}
                    <FormField
                      control={form.control}
                      name="activeUplinksPerAggregation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm text-muted-foreground">{t('threeTier.activeUplinksPerAggregation')}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={32}
                              data-testid="active-uplinks-aggr"
                              {...field}
                              onChange={(e) => {
                                const val = e.target.value
                                field.onChange(val === '' ? '' : Number(val))
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Core Switch Model */}
                    <FormField
                      control={form.control}
                      name="coreModel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm text-muted-foreground">{t('threeTier.coreModel')}</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CORE_MODELS.map((model) => (
                                <SelectItem key={model} value={model}>{model}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* === Section 3: FC Fabric === */}
          <AccordionItem value="fc-fabric">
            <AccordionTrigger className="text-base font-semibold px-6 py-4">
              {t('input.section.fcFabric')}
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* FC Switch Model */}
                <FormField
                  control={form.control}
                  name="fcSwitchModel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-muted-foreground">{t('fc.switchModel')}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('fc.selectSwitchModel')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredFCModels.map((model) => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Preferred Generation */}
                <FormField
                  control={form.control}
                  name="preferredGeneration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-muted-foreground">{t('fc.preferredGeneration')}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('fc.genAny')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {GENERATION_OPTIONS.map((gen) => (
                            <SelectItem key={gen} value={gen}>{t(GENERATION_LABELS[gen])}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>{t('fc.preferredGenerationHelp')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* HBA Ports per Server */}
                <FormField
                  control={form.control}
                  name="hbaPortsPerServer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-muted-foreground">{t('fc.hbaPortsPerServer')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={8}
                          data-testid="hba-ports-per-server"
                          {...field}
                          onChange={(e) => {
                            const val = e.target.value
                            field.onChange(val === '' ? '' : Number(val))
                          }}
                        />
                      </FormControl>
                      <FormDescription>{t('converged.hbaPortsHelp')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Storage Target Ports */}
                <FormField
                  control={form.control}
                  name="storageTargetPorts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-muted-foreground">{t('fc.storageTargetPorts')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={2}
                          max={128}
                          data-testid="storage-target-ports"
                          {...field}
                          onChange={(e) => {
                            const val = e.target.value
                            field.onChange(val === '' ? '' : Number(val))
                          }}
                        />
                      </FormControl>
                      <FormDescription>{t('fc.storageTargetHelp')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Storage Array Count */}
                <FormField
                  control={form.control}
                  name="storageArrayCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-muted-foreground">{t('fc.storageArrayCount')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={32}
                          data-testid="storage-array-count"
                          {...field}
                          onChange={(e) => {
                            const val = e.target.value
                            field.onChange(val === '' ? '' : Number(val))
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* ISL Ports per Switch */}
                <FormField
                  control={form.control}
                  name="islPortsPerSwitch"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-muted-foreground">{t('fc.islPortsPerSwitch')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={32}
                          data-testid="isl-ports-per-switch"
                          {...field}
                          onChange={(e) => {
                            const val = e.target.value
                            field.onChange(val === '' ? '' : Number(val))
                          }}
                        />
                      </FormControl>
                      <FormDescription>{t('fc.islPortsHelp')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* === Section 4: Advanced === */}
          <AccordionItem value="advanced">
            <AccordionTrigger className="text-base font-semibold px-6 py-4">
              {t('input.section.advanced')}
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Switch Positioning */}
                <FormField
                  control={form.control}
                  name="switchPositioning"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-muted-foreground">{t('sizing.switchPositioning')}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('sizing.selectSwitchPositioning')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ToR">{t('sizing.positionToR')}</SelectItem>
                          <SelectItem value="MoR">{t('sizing.positionMoR')}</SelectItem>
                          <SelectItem value="BoR">{t('sizing.positionBoR')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>{t('sizing.positioningHelp')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Brownfield toggle — topology conditional */}
                {currentTopology === 'leaf-spine' && (
                  <FormField
                    control={form.control}
                    name="existingSpinesDeployed"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 sm:col-span-2">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                            data-testid="existing-spines-toggle"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-normal">{t('infra.existingSpinesToggle')}</FormLabel>
                          <FormDescription>{t('infra.existingSpinesHelp')}</FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                )}

                {currentTopology === 'three-tier' && (
                  <FormField
                    control={form.control}
                    name="existingCoreDeployed"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 sm:col-span-2">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                            data-testid="existing-core-toggle"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-normal">{t('infra.existingCoreToggle')}</FormLabel>
                          <FormDescription>{t('infra.existingCoreHelp')}</FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </form>
    </Form>
  )
}
