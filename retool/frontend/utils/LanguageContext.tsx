import { createContext, useContext, useState } from "react"
import { translations } from "./translations"
import type { Lang, Translations } from "./translations"

type LanguageContextType = {
  lang: Lang
  t: Translations
  toggleLang: () => void
}

const LanguageContext = createContext<LanguageContextType | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("el")
  const t = translations[lang]
  const toggleLang = () => setLang((l) => (l === "el" ? "en" : "el"))

  return (
    <LanguageContext.Provider value={{ lang, t, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider")
  return ctx
}
