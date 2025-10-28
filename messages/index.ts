// /messages/index.ts
import en from './en.json'
import id from './id.json'
import jp from './jp.json'

export const messages = {
  en,
  id,
  jp
}

export type Locale = keyof typeof messages