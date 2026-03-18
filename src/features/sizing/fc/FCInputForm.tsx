import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/shallow'
import { useFCInputStore } from '@/store/fcInputStore'
import { FC_SWITCH_CATALOG } from '@/domain/catalog/brocade'
import type { FCSizingInput } from '@/domain/schemas/fc-input'
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
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

const RACK_SIZES = ['24U', '42U', '50U'] as const
const SERVER_U_HEIGHTS = ['1U', '2U', '4U', '8U'] as const

const U_HEIGHT_LABELS: Record<string, string> = {
  '1U': 'sizing.uHeight1U',
  '2U': 'sizing.uHeight2U',
  '4U': 'sizing.uHeight4U',
  '8U': 'sizing.uHeight8U',
}

const GENERATION_OPTIONS = ['any', 'gen7', 'gen8'] as const
type PreferredGeneration = typeof GENERATION_OPTIONS[number]

const GENERATION_LABELS: Record<PreferredGeneration, string> = {
  any: 'fc.genAny',
  gen7: 'fc.gen7',
  gen8: 'fc.gen8',
}

type FCSwitchModelId = keyof typeof FC_SWITCH_CATALOG

type FCFormValues = {
  rackCount: number
  rackServers: number[]
  hbaPortsPerServer: number
  storageTargetPorts: number
  storageArrayCount: number
  fcSwitchModel: FCSwitchModelId
  islPortsPerSwitch: number
  rackSize: '24U' | '42U' | '50U'
  serverUHeight: '1U' | '2U' | '4U' | '8U'
  preferredGeneration: PreferredGeneration
}

export function FCInputForm() {
  const { t } = useTranslation()
  const { input, setInput, resetInput } = useFCInputStore(
    useShallow((s) => ({ input: s.input, setInput: s.setInput, resetInput: s.resetInput }))
  )

  // CRITICAL: Do NOT pass generic type argument to useForm with Zod v4
  const form = useForm<FCFormValues>({
    defaultValues: {
      rackCount: input.racks.length,
      rackServers: input.racks.map((r) => r.serverCount),
      hbaPortsPerServer: input.hbaPortsPerServer,
      storageTargetPorts: input.storageTargetPorts,
      storageArrayCount: input.storageArrayCount,
      fcSwitchModel: input.fcSwitchModel,
      islPortsPerSwitch: input.islPortsPerSwitch,
      rackSize: input.rackSize,
      serverUHeight: input.serverUHeight,
      preferredGeneration: input.preferredGeneration,
    },
    mode: 'onChange',
  })

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const subscription = form.watch((values, { name }) => {
      const v = values as Partial<FCFormValues>

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
        name === 'hbaPortsPerServer' ||
        name === 'storageTargetPorts' ||
        name === 'storageArrayCount' ||
        name === 'islPortsPerSwitch'
      ) {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          const numVal = Number(v[name as keyof FCFormValues])
          if (!isNaN(numVal)) {
            setInput({ [name]: numVal } as Partial<FCSizingInput>)
          }
        }, 150)
        return
      }

      // Select inputs: immediate update
      const {
        rackCount: _rc,
        rackServers: _rs,
        hbaPortsPerServer: _hba,
        storageTargetPorts: _stp,
        storageArrayCount: _sac,
        islPortsPerSwitch: _isl,
        ...rest
      } = v as FCFormValues
      const validRest = Object.fromEntries(
        Object.entries(rest).filter(([, val]) => val !== undefined && val !== null && String(val) !== '')
      )
      if (Object.keys(validRest).length > 0) {
        setInput(validRest as Partial<FCSizingInput>)
      }
    })

    return () => {
      subscription.unsubscribe()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [form, setInput])

  const watchedRackServers = form.watch('rackServers') ?? []
  const totalServers = watchedRackServers.reduce((sum, c) => sum + (Number(c) || 0), 0)

  // Derive model list from catalog — filtered by preferredGeneration
  const watchedGeneration = (form.watch('preferredGeneration') as PreferredGeneration) ?? 'any'
  const filteredModels: FCSwitchModelId[] =
    watchedGeneration === 'any'
      ? (Object.keys(FC_SWITCH_CATALOG) as FCSwitchModelId[])
      : (Object.keys(FC_SWITCH_CATALOG) as FCSwitchModelId[]).filter((m) => {
          const gen = FC_SWITCH_CATALOG[m].generation
          return watchedGeneration === 'gen7' ? gen === 7 : gen === 8
        })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          {t('fc.heading')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-6">

            {/* === Rack Configuration === */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                {t('sizing.rackConfigHeading')}
              </h3>

              {/* Rack Count */}
              <FormField
                control={form.control}
                name="rackCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('sizing.rackCount')}</FormLabel>
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
                          <FormLabel className="w-16 shrink-0 text-xs">
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
            </div>

            {/* === FC Parameters === */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                {t('fc.heading')}
              </h3>

              {/* HBA Ports per Server */}
              <FormField
                control={form.control}
                name="hbaPortsPerServer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fc.hbaPortsPerServer')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={8}
                        data-testid="hba-ports-per-server"
                        {...field}
                        onChange={(e) => {
                          const val = e.target.value
                          field.onChange(val === '' ? '' : Number(val))
                        }}
                      />
                    </FormControl>
                    <FormDescription>{t('fc.hbaPortsHelp')}</FormDescription>
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
                    <FormLabel>{t('fc.storageTargetPorts')}</FormLabel>
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
                    <FormLabel>{t('fc.storageArrayCount')}</FormLabel>
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
            </div>

            {/* === Switch Configuration === */}
            <div className="space-y-3">
              {/* Preferred Generation selector */}
              <FormField
                control={form.control}
                name="preferredGeneration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fc.preferredGeneration')}</FormLabel>
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

              {/* FC Switch Model */}
              <FormField
                control={form.control}
                name="fcSwitchModel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fc.switchModel')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('fc.selectSwitchModel')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredModels.map((model) => (
                          <SelectItem key={model} value={model}>{model}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <FormLabel>{t('fc.islPortsPerSwitch')}</FormLabel>
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

            {/* === Physical === */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                {t('sizing.physicalHeading')}
              </h3>

              {/* Rack Size */}
              <FormField
                control={form.control}
                name="rackSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('sizing.rackSize')}</FormLabel>
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

              {/* Server U-Height */}
              <FormField
                control={form.control}
                name="serverUHeight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('sizing.serverUHeight')}</FormLabel>
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
            </div>

            {/* Reset button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => {
                resetInput()
                form.reset({
                  rackCount: 3,
                  rackServers: [16, 16, 16],
                  hbaPortsPerServer: 2,
                  storageTargetPorts: 4,
                  storageArrayCount: 1,
                  fcSwitchModel: 'G720',
                  islPortsPerSwitch: 4,
                  rackSize: '42U',
                  serverUHeight: '1U',
                  preferredGeneration: 'any',
                })
              }}
            >
              {t('fc.resetButton')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
