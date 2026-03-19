import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/shallow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useInputStore } from '@/store/inputStore'
import { useFCInputStore } from '@/store/fcInputStore'
import { useConvergedInputStore } from '@/store/convergedInputStore'
import {
  saveProfile,
  loadProfile,
  listProfiles,
  deleteProfile,
} from '@/domain/profiles/profileService'
import type { Profile } from '@/domain/schemas/profile'
import type { SizingInput } from '@/domain/schemas/input'
import type { FCSizingInput } from '@/domain/schemas/fc-input'
import type { ConvergedSizingInput } from '@/domain/schemas/converged-input'

interface ProfileManagerProps {
  mode: 'ethernet' | 'fc' | 'converged'
  open: boolean
  onClose: () => void
  onModeChange: (m: 'ethernet' | 'fc' | 'converged') => void
}

export function ProfileManager({ mode, open, onClose, onModeChange }: ProfileManagerProps) {
  const { t } = useTranslation()
  const [profileName, setProfileName] = useState('')
  const [profiles, setProfiles] = useState<Profile[]>([])

  const ethernetInput = useInputStore(useShallow((s) => s.input))
  const setEthernetInput = useInputStore(useShallow((s) => s.setInput))
  const fcInput = useFCInputStore(useShallow((s) => s.input))
  const setFCInput = useFCInputStore(useShallow((s) => s.setInput))
  const convergedInput = useConvergedInputStore(useShallow((s) => s.input))
  const setConvergedInput = useConvergedInputStore(useShallow((s) => s.setInput))

  useEffect(() => {
    if (open) setProfiles(listProfiles())
  }, [open])

  if (!open) return null

  const activeInput =
    mode === 'fc' ? fcInput : mode === 'converged' ? convergedInput : ethernetInput

  const activeTopology =
    mode === 'ethernet'
      ? ethernetInput.topology
      : mode === 'converged'
        ? convergedInput.topology
        : undefined

  const handleSave = () => {
    const name = profileName.trim()
    if (!name) return
    saveProfile({
      name,
      mode,
      topology: activeTopology,
      inputState: activeInput as Record<string, unknown>,
    })
    setProfileName('')
    setProfiles(listProfiles())
  }

  const handleLoad = (profile: Profile) => {
    const loaded = loadProfile(profile.id)
    if (!loaded) return
    if (loaded.mode !== mode) onModeChange(loaded.mode)
    if (loaded.mode === 'fc') {
      setFCInput(loaded.inputState as Partial<FCSizingInput>)
    } else if (loaded.mode === 'converged') {
      setConvergedInput(loaded.inputState as Partial<ConvergedSizingInput>)
    } else {
      setEthernetInput(loaded.inputState as Partial<SizingInput>)
    }
    onClose()
  }

  const handleDelete = (profile: Profile) => {
    const confirmed = window.confirm(
      t('profiles.deleteConfirm', { name: profile.name })
    )
    if (!confirmed) return
    deleteProfile(profile.id)
    setProfiles(listProfiles())
  }

  const topologyLabel = (topo?: string) => {
    if (topo === 'leaf-spine') return t('mode.topologyClos')
    if (topo === 'three-tier') return t('mode.topologyThreeTier')
    return '—'
  }

  return (
    <div className="fixed left-0 right-0 top-11 z-20 border-b bg-background shadow-lg">
      <div className="mx-auto max-h-96 overflow-y-auto p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{t('profiles.managerTitle')}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label={t('profiles.closePanelAriaLabel')}
          >
            ✕
          </Button>
        </div>

        {/* Save form */}
        <div className="mb-4 flex gap-2">
          <Input
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder={t('profiles.namePlaceholder')}
            aria-label={t('profiles.nameLabel')}
            className="max-w-xs"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <Button onClick={handleSave} disabled={!profileName.trim()} size="sm">
            {t('profiles.saveButton')}
          </Button>
        </div>

        {/* Profile list */}
        {profiles.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            <p>{t('profiles.emptyList')}</p>
            <p className="mt-1 text-xs">{t('profiles.emptyListHint')}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">{t('profiles.colName')}</th>
                <th className="pb-2 pr-4 font-medium">{t('profiles.colMode')}</th>
                <th className="pb-2 pr-4 font-medium">{t('profiles.colTopology')}</th>
                <th className="pb-2 pr-4 font-medium">{t('profiles.colServers')}</th>
                <th className="pb-2 pr-4 font-medium">{t('profiles.colDate')}</th>
                <th className="pb-2 font-medium">{t('profiles.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.id} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium">{profile.name}</td>
                  <td className="py-2 pr-4">{t(`mode.${profile.mode}`)}</td>
                  <td className="py-2 pr-4">{topologyLabel(profile.topology)}</td>
                  <td className="py-2 pr-4">{profile.serverCount}</td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {new Date(profile.date).toLocaleDateString()}
                  </td>
                  <td className="py-2">
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleLoad(profile)}
                      >
                        {t('profiles.loadButton')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                        onClick={() => handleDelete(profile)}
                      >
                        {t('profiles.deleteButton')}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
