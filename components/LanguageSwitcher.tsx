'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Locale } from '@/messages'

type Props = {
  textClassName?: string 
}

export function LanguageSwitcher({ textClassName = 'text-gray-700' }: Props) {
  const pathname = usePathname()
  const [locale, setLocale] = useState<Locale | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('locale') as Locale
    setLocale(stored || 'en')
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value

    localStorage.setItem('locale', newLocale)
    setLocale(newLocale as Locale)
    window.dispatchEvent(new CustomEvent('locale-change', { detail: newLocale }))
  }

  if (!locale) return null

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="language" className={`text-sm ${textClassName}`}>
        Language:
      </label>
      <select
        id="language"
        onChange={handleChange}
        defaultValue={locale}
        className="bg-white text-gray-900 border border-gray-300 p-1 rounded"
      >
        <option value="en">US</option>
        <option value="id">ID</option>
        <option value="jp">JP</option>
      </select>
    </div>
  )
}