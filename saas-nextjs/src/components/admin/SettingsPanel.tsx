'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { adminApi } from '@/lib/admin-api'
import { getErrorMessage } from '@/lib/api'
import type { AllSettings } from '@/types'

type TabId = 'voice' | 'email' | 'security' | 'rate-limits' | 'file-storage' | 'oauth'

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'voice', label: 'Voice' },
  { id: 'email', label: 'Email' },
  { id: 'security', label: 'Security' },
  { id: 'rate-limits', label: 'Rate limits' },
  { id: 'file-storage', label: 'Storage' },
  { id: 'oauth', label: 'OAuth' },
]

const fieldClass =
  'w-full rounded-md border border-line bg-white/80 px-3 py-2.5 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'

const Field = ({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) => (
  <label className="block space-y-1.5">
    <span className="text-sm font-medium text-ink">{label}</span>
    {children}
  </label>
)

export const SettingsPanel = () => {
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as TabId) || 'voice'
  const [tab, setTab] = useState<TabId>(
    TABS.some((item) => item.id === initialTab) ? initialTab : 'voice'
  )
  const [settings, setSettings] = useState<AllSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setSettings(await adminApi.getSettings())
      } catch (error) {
        toast.error(getErrorMessage(error, 'Could not load settings'))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tab)
    window.history.replaceState({}, '', url.toString())
  }, [tab])

  const voice = settings?.voice
  const email = settings?.email
  const security = settings?.security
  const rateLimits = settings?.rateLimits
  const fileStorage = settings?.fileStorage
  const oauth = settings?.oauth

  const title = useMemo(() => TABS.find((item) => item.id === tab)?.label || 'Settings', [tab])

  if (loading || !settings) {
    return <p className="text-ink-soft">Loading settings…</p>
  }

  const handleSaveVoice = async () => {
    if (!voice) return
    setSaving(true)
    try {
      const updated = await adminApi.updateVoice(voice)
      setSettings((prev) => (prev ? { ...prev, voice: updated } : prev))
      toast.success('Voice settings saved')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save voice settings'))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEmail = async () => {
    if (!email) return
    setSaving(true)
    try {
      const updated = await adminApi.updateEmail(email)
      setSettings((prev) => (prev ? { ...prev, email: updated } : prev))
      toast.success('Email settings saved')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save email settings'))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSecurity = async () => {
    if (!security) return
    setSaving(true)
    try {
      const updated = await adminApi.updateSecurity(security)
      setSettings((prev) => (prev ? { ...prev, security: updated } : prev))
      toast.success('Security settings saved')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save security settings'))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveRateLimits = async () => {
    if (!rateLimits) return
    setSaving(true)
    try {
      const updated = await adminApi.updateRateLimits(rateLimits)
      setSettings((prev) => (prev ? { ...prev, rateLimits: updated } : prev))
      toast.success('Rate limit settings saved')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save rate limits'))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveStorage = async () => {
    if (!fileStorage) return
    setSaving(true)
    try {
      const updated = await adminApi.updateFileStorage(fileStorage)
      setSettings((prev) => (prev ? { ...prev, fileStorage: updated } : prev))
      toast.success('Storage settings saved')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save storage settings'))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveOAuth = async () => {
    if (!oauth) return
    setSaving(true)
    try {
      const updated = await adminApi.updateOAuth(oauth)
      setSettings((prev) => (prev ? { ...prev, oauth: updated } : prev))
      toast.success('OAuth settings saved')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save OAuth settings'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-ink">Settings</h1>
        <p className="mt-2 text-ink-soft">Configure email, security, storage, OAuth, and voice free-beta caps.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-md px-3 py-2 text-sm font-medium transition ${
              tab === item.id ? 'bg-teal text-white' : 'border border-line text-ink-soft hover:text-ink'
            }`}
            aria-pressed={tab === item.id}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="glass-panel space-y-5 rounded-2xl p-6">
        <h2 className="font-display text-2xl text-ink">{title}</h2>

        {tab === 'voice' && voice && (
          <>
            <Field label="Gemini API key">
              <input
                type="password"
                className={fieldClass}
                value={voice.geminiApiKey}
                onChange={(event) =>
                  setSettings((prev) =>
                    prev ? { ...prev, voice: { ...prev.voice, geminiApiKey: event.target.value } } : prev
                  )
                }
                placeholder="Leave masked to keep current key"
              />
            </Field>
            <Field label="Gemini Live model">
              <input
                className={fieldClass}
                value={voice.geminiModel}
                onChange={(event) =>
                  setSettings((prev) =>
                    prev ? { ...prev, voice: { ...prev.voice, geminiModel: event.target.value } } : prev
                  )
                }
              />
            </Field>
            <Field label="System prompt">
              <textarea
                rows={4}
                className={fieldClass}
                value={voice.systemPrompt}
                onChange={(event) =>
                  setSettings((prev) =>
                    prev ? { ...prev, voice: { ...prev.voice, systemPrompt: event.target.value } } : prev
                  )
                }
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ['maxSessionsPerUser', 'Max sessions / user'],
                  ['maxSessionDurationSeconds', 'Max session seconds'],
                  ['maxDailyMinutesPerUser', 'Daily minutes / user'],
                  ['maxGlobalSessions', 'Global concurrent sessions'],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label}>
                  <input
                    type="number"
                    className={fieldClass}
                    value={voice[key]}
                    onChange={(event) =>
                      setSettings((prev) =>
                        prev
                          ? {
                              ...prev,
                              voice: { ...prev.voice, [key]: Number(event.target.value) },
                            }
                          : prev
                      )
                    }
                  />
                </Field>
              ))}
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                void handleSaveVoice()
              }}
              className="rounded-md bg-teal px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Save voice settings
            </button>
          </>
        )}

        {tab === 'email' && email && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="SMTP host">
                <input
                  className={fieldClass}
                  value={email.host}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev ? { ...prev, email: { ...prev.email, host: event.target.value } } : prev
                    )
                  }
                />
              </Field>
              <Field label="SMTP port">
                <input
                  type="number"
                  className={fieldClass}
                  value={email.port}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev ? { ...prev, email: { ...prev.email, port: Number(event.target.value) } } : prev
                    )
                  }
                />
              </Field>
              <Field label="Username">
                <input
                  className={fieldClass}
                  value={email.username}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev ? { ...prev, email: { ...prev.email, username: event.target.value } } : prev
                    )
                  }
                />
              </Field>
              <Field label="Password">
                <input
                  type="password"
                  className={fieldClass}
                  value={email.password}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev ? { ...prev, email: { ...prev.email, password: event.target.value } } : prev
                    )
                  }
                />
              </Field>
              <Field label="From address">
                <input
                  className={fieldClass}
                  value={email.from}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev ? { ...prev, email: { ...prev.email, from: event.target.value } } : prev
                    )
                  }
                />
              </Field>
              <Field label="From name">
                <input
                  className={fieldClass}
                  value={email.fromName}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev ? { ...prev, email: { ...prev.email, fromName: event.target.value } } : prev
                    )
                  }
                />
              </Field>
              <Field label="Verification base URL">
                <input
                  className={fieldClass}
                  value={email.verificationBaseUrl}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev
                        ? { ...prev, email: { ...prev.email, verificationBaseUrl: event.target.value } }
                        : prev
                    )
                  }
                />
              </Field>
              <Field label="Password reset base URL">
                <input
                  className={fieldClass}
                  value={email.passwordResetBaseUrl}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev
                        ? { ...prev, email: { ...prev.email, passwordResetBaseUrl: event.target.value } }
                        : prev
                    )
                  }
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={email.enabled}
                onChange={(event) =>
                  setSettings((prev) =>
                    prev ? { ...prev, email: { ...prev.email, enabled: event.target.checked } } : prev
                  )
                }
              />
              Email enabled
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  void handleSaveEmail()
                }}
                className="rounded-md bg-teal px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                Save email settings
              </button>
              <button
                type="button"
                onClick={() => {
                  void adminApi
                    .testEmail(email)
                    .then((response) => toast.success(response.message || 'Email test OK'))
                    .catch((error) => toast.error(getErrorMessage(error, 'Email test failed')))
                }}
                className="rounded-md border border-line px-4 py-2.5 text-sm font-medium"
              >
                Test connection
              </button>
            </div>
          </>
        )}

        {tab === 'security' && security && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ['maxFailedLoginAttempts', 'Max failed logins'],
                  ['accountLockoutDuration', 'Lockout minutes'],
                  ['passwordMinLength', 'Password min length'],
                  ['passwordMaxLength', 'Password max length'],
                  ['sessionTimeout', 'Session timeout (min)'],
                  ['emailVerificationTokenExpiry', 'Verify token hours'],
                  ['passwordResetTokenExpiry', 'Reset token hours'],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label}>
                  <input
                    type="number"
                    className={fieldClass}
                    value={security[key]}
                    onChange={(event) =>
                      setSettings((prev) =>
                        prev
                          ? {
                              ...prev,
                              security: { ...prev.security, [key]: Number(event.target.value) },
                            }
                          : prev
                      )
                    }
                  />
                </Field>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ['passwordRequireUppercase', 'Require uppercase'],
                  ['passwordRequireLowercase', 'Require lowercase'],
                  ['passwordRequireDigit', 'Require digit'],
                  ['passwordRequireSpecialChar', 'Require special char'],
                  ['requireEmailVerification', 'Require email verification'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={security[key]}
                    onChange={(event) =>
                      setSettings((prev) =>
                        prev
                          ? {
                              ...prev,
                              security: { ...prev.security, [key]: event.target.checked },
                            }
                          : prev
                      )
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                void handleSaveSecurity()
              }}
              className="rounded-md bg-teal px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Save security settings
            </button>
          </>
        )}

        {tab === 'rate-limits' && rateLimits && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ['loginRequests', 'Login requests'],
                  ['loginDuration', 'Login duration (h)'],
                  ['registrationRequests', 'Registration requests'],
                  ['registrationDuration', 'Registration duration (h)'],
                  ['passwordChangeRequests', 'Password-change requests'],
                  ['passwordChangeDuration', 'Password-change duration (h)'],
                  ['generalRequests', 'General API requests'],
                  ['generalDuration', 'General duration (h)'],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label}>
                  <input
                    type="number"
                    className={fieldClass}
                    value={rateLimits[key]}
                    onChange={(event) =>
                      setSettings((prev) =>
                        prev
                          ? {
                              ...prev,
                              rateLimits: { ...prev.rateLimits, [key]: Number(event.target.value) },
                            }
                          : prev
                      )
                    }
                  />
                </Field>
              ))}
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                void handleSaveRateLimits()
              }}
              className="rounded-md bg-teal px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Save rate limits
            </button>
          </>
        )}

        {tab === 'file-storage' && fileStorage && (
          <>
            <Field label="Mode">
              <select
                className={fieldClass}
                value={fileStorage.mode}
                onChange={(event) =>
                  setSettings((prev) =>
                    prev
                      ? {
                          ...prev,
                          fileStorage: {
                            ...prev.fileStorage,
                            mode: event.target.value as 'local' | 's3',
                          },
                        }
                      : prev
                  )
                }
              >
                <option value="local">local</option>
                <option value="s3">s3</option>
              </select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Max file size (bytes)">
                <input
                  type="number"
                  className={fieldClass}
                  value={fileStorage.maxFileSize}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            fileStorage: {
                              ...prev.fileStorage,
                              maxFileSize: Number(event.target.value),
                            },
                          }
                        : prev
                    )
                  }
                />
              </Field>
              <Field label="Allowed image types">
                <input
                  className={fieldClass}
                  value={fileStorage.allowedImageTypes}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            fileStorage: {
                              ...prev.fileStorage,
                              allowedImageTypes: event.target.value,
                            },
                          }
                        : prev
                    )
                  }
                />
              </Field>
              <Field label="Local base path">
                <input
                  className={fieldClass}
                  value={fileStorage.localBasePath}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            fileStorage: {
                              ...prev.fileStorage,
                              localBasePath: event.target.value,
                            },
                          }
                        : prev
                    )
                  }
                />
              </Field>
              <Field label="Local public prefix">
                <input
                  className={fieldClass}
                  value={fileStorage.localPublicPrefix}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            fileStorage: {
                              ...prev.fileStorage,
                              localPublicPrefix: event.target.value,
                            },
                          }
                        : prev
                    )
                  }
                />
              </Field>
              <Field label="S3 bucket">
                <input
                  className={fieldClass}
                  value={fileStorage.s3BucketName}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            fileStorage: {
                              ...prev.fileStorage,
                              s3BucketName: event.target.value,
                            },
                          }
                        : prev
                    )
                  }
                />
              </Field>
              <Field label="S3 region">
                <input
                  className={fieldClass}
                  value={fileStorage.s3Region}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            fileStorage: { ...prev.fileStorage, s3Region: event.target.value },
                          }
                        : prev
                    )
                  }
                />
              </Field>
              <Field label="S3 access key">
                <input
                  type="password"
                  className={fieldClass}
                  value={fileStorage.s3AccessKey}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            fileStorage: {
                              ...prev.fileStorage,
                              s3AccessKey: event.target.value,
                            },
                          }
                        : prev
                    )
                  }
                />
              </Field>
              <Field label="S3 secret key">
                <input
                  type="password"
                  className={fieldClass}
                  value={fileStorage.s3SecretKey}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            fileStorage: {
                              ...prev.fileStorage,
                              s3SecretKey: event.target.value,
                            },
                          }
                        : prev
                    )
                  }
                />
              </Field>
              <Field label="S3 public base URL">
                <input
                  className={fieldClass}
                  value={fileStorage.s3PublicBaseUrl}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            fileStorage: {
                              ...prev.fileStorage,
                              s3PublicBaseUrl: event.target.value,
                            },
                          }
                        : prev
                    )
                  }
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={fileStorage.cleanupEnabled}
                onChange={(event) =>
                  setSettings((prev) =>
                    prev
                      ? {
                          ...prev,
                          fileStorage: {
                            ...prev.fileStorage,
                            cleanupEnabled: event.target.checked,
                          },
                        }
                      : prev
                  )
                }
              />
              Cleanup enabled
            </label>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                void handleSaveStorage()
              }}
              className="rounded-md bg-teal px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Save storage settings
            </button>
          </>
        )}

        {tab === 'oauth' && oauth && (
          <>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={oauth.enabled}
                onChange={(event) =>
                  setSettings((prev) =>
                    prev ? { ...prev, oauth: { ...prev.oauth, enabled: event.target.checked } } : prev
                  )
                }
              />
              Google OAuth enabled
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Client ID">
                <input
                  className={fieldClass}
                  value={oauth.clientId}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev ? { ...prev, oauth: { ...prev.oauth, clientId: event.target.value } } : prev
                    )
                  }
                />
              </Field>
              <Field label="Client secret">
                <input
                  type="password"
                  className={fieldClass}
                  value={oauth.clientSecret}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev
                        ? { ...prev, oauth: { ...prev.oauth, clientSecret: event.target.value } }
                        : prev
                    )
                  }
                />
              </Field>
              <Field label="Redirect URI">
                <input
                  className={fieldClass}
                  value={oauth.redirectUri}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev
                        ? { ...prev, oauth: { ...prev.oauth, redirectUri: event.target.value } }
                        : prev
                    )
                  }
                />
              </Field>
              <Field label="Authorized domains">
                <input
                  className={fieldClass}
                  value={oauth.authorizedDomains}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            oauth: { ...prev.oauth, authorizedDomains: event.target.value },
                          }
                        : prev
                    )
                  }
                />
              </Field>
              <Field label="Scopes">
                <input
                  className={fieldClass}
                  value={oauth.scopes}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev ? { ...prev, oauth: { ...prev.oauth, scopes: event.target.value } } : prev
                    )
                  }
                />
              </Field>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  void handleSaveOAuth()
                }}
                className="rounded-md bg-teal px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                Save OAuth settings
              </button>
              <button
                type="button"
                onClick={() => {
                  void adminApi
                    .testOAuth(oauth)
                    .then((response) => toast.success(response.message || 'OAuth config OK'))
                    .catch((error) => toast.error(getErrorMessage(error, 'OAuth test failed')))
                }}
                className="rounded-md border border-line px-4 py-2.5 text-sm font-medium"
              >
                Validate config
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
