'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import { Locale } from '@/messages'

type Props = {
  textClassName?: string 
}

export function LanguageSwitcher({ textClassName = 'text-gray-700' }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [locale, setLocale] = useState<Locale>('en')

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value

    localStorage.setItem('locale', newLocale)
    setLocale(newLocale as Locale)
    window.dispatchEvent(new CustomEvent('locale-change', { detail: newLocale }))
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="language" className={`text-sm ${textClassName}`}>
        Language:
      </label>
      <select
        onChange={handleChange}
        defaultValue={pathname.split('/')[1]}
        className="bg-white text-gray-900 border border-gray-300 p-1 rounded"
      >
        <option value="en">US</option>
        <option value="id">ID</option>
      </select>
    </div>
  )
}