// /messages/index.ts
import en from './en.json'
import id from './id.json'

export const messages = {
  en,
  id
}

export type Locale = keyof typeof messages