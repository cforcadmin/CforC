'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'
import ScrollToTop from '@/components/ScrollToTop'
import CombinedCtaSection from '@/components/CombinedCtaSection'
import LoadingIndicator from '@/components/LoadingIndicator'
import LocalizedText from '@/components/LocalizedText'
import Link from 'next/link'
import Image from 'next/image'
import { AccessibilityButton } from '@/components/AccessibilityMenu'
import { getMembers, getCoordinationTeams } from '@/lib/strapi'
import FieldsFilter from '@/components/members/FieldsFilter'
import CityFilter from '@/components/members/CityFilter'
import ProvinceFilter from '@/components/members/ProvinceFilter'
import SortFilter from '@/components/members/SortFilter'
import ViewToggle from '@/components/shared/ViewToggle'
import MemberFlipCard from '@/components/shared/MemberFlipCard'
import { doesFieldMatchFilter } from '@/lib/memberTaxonomy'
import { matchesName } from '@/lib/transliterate'
import { useNavMode } from '@/components/nav/useNavMode'
import CoolMemberBand from '@/components/about-cool/CoolMemberBand'
import { CITY_TO_PROVINCE } from '@/lib/greekCities'

interface Member {
  id: number
  documentId: string
  Name: string
  EngName?: string
  Slug: string
  Bio: string
  EngBio?: any
  FieldsOfWork: string
  City: string
  Province: string
  Email: string
  Phone: string
  Websites: string
  Image?: Array<{
    url: string
    alternativeText?: string
  }>
  ProfileImageAltText?: string  // Accessibility alt text for profile image
  Project1Title?: string
  Project1Description?: string
  Project1Pictures?: Array<{
    url: string
    alternativeText?: string
  }>
  Project1PicturesAltText?: string  // Accessibility alt text for project 1 images
  Project1Tags?: string
  Project2Title?: string
  Project2Description?: string
  Project2Pictures?: Array<{
    url: string
    alternativeText?: string
  }>
  Project2PicturesAltText?: string  // Accessibility alt text for project 2 images
  Project2Tags?: string
  HideProfile?: boolean
  createdAt?: string
}

type MembersPreset = 'all' | 'new' | 'thessaloniki' | 'athens' | 'rest' | 'abroad'

export default function MembersPage() {
  return (
    <Suspense>
      <MembersPageContent />
    </Suspense>
  )
}

const STORAGE_KEY = 'cforc-members-search'

function saveMembersSearch(state: {
  searchQuery: string
  selectedFields: string[]
  selectedCities: string[]
  selectedProvinces: string[]
  sortMode: string
  filterLogic: string
  viewMode: string
}) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

function loadMembersSearch() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function MembersPageContent() {
  const { mode } = useNavMode()
  const cool = mode === 'cool'
  // Cool presets στο κάτω χείλος του hero — προεπιλογή «Όλα» (τυχαία σειρά)
  const [preset, setPreset] = useState<MembersPreset>('all')
  // Τυχαίο πορτρέτο μέλους στη σκηνή — αλλάζει σε κάθε φόρτωση
  const [heroSeed] = useState(() => Math.random())
  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([])
  const searchParams = useSearchParams()
  const [sortMode, setSortMode] = useState<'none' | 'alpha-asc' | 'alpha-desc' | 'random'>('random')
  const [totalCount, setTotalCount] = useState(0)
  const [displayCount, setDisplayCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [memberRoles, setMemberRoles] = useState<Record<number, string[]>>({})
  const [accessibilityButtonScale, setAccessibilityButtonScale] = useState(1)
  const [filterLogic, setFilterLogic] = useState<'or' | 'and'>('and')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [initialized, setInitialized] = useState(false)

  // Stable string from URL params so the effect re-runs when they change
  const urlParamKey = searchParams.toString()

  // Restore from URL params (priority) or sessionStorage.
  // Depends on urlParamKey so clicking city/province links while already on /members re-applies filters.
  useEffect(() => {
    const fieldParam = searchParams.get('field')
    const cityParam = searchParams.get('city')
    const provinceParam = searchParams.get('province')
    const hasUrlParams = fieldParam || cityParam || provinceParam

    if (hasUrlParams) {
      // URL params take priority (e.g. from tag clicks, globe icons)
      setSelectedFields(fieldParam ? [fieldParam] : [])
      setSelectedCities(cityParam ? [cityParam] : [])
      setSelectedProvinces(provinceParam ? [provinceParam] : [])
    } else if (!initialized) {
      // Only restore from sessionStorage on first mount
      const saved = loadMembersSearch()
      if (saved) {
        setSearchQuery(saved.searchQuery || '')
        setSelectedFields(saved.selectedFields || [])
        setSelectedCities(saved.selectedCities || [])
        setSelectedProvinces(saved.selectedProvinces || [])
        setSortMode(saved.sortMode || 'random')
        setFilterLogic(saved.filterLogic || 'and')
        setViewMode(saved.viewMode || 'grid')
      }
    }
    setInitialized(true)
  }, [urlParamKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist search state to sessionStorage whenever it changes
  useEffect(() => {
    if (!initialized) return
    saveMembersSearch({
      searchQuery,
      selectedFields,
      selectedCities,
      selectedProvinces,
      sortMode,
      filterLogic,
      viewMode,
    })
  }, [initialized, searchQuery, selectedFields, selectedCities, selectedProvinces, sortMode, filterLogic, viewMode])

  // Handle scroll for accessibility button fade
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      const fadeStart = 50
      const fadeEnd = 150

      if (scrollPosition <= fadeStart) {
        setAccessibilityButtonScale(1)
      } else if (scrollPosition >= fadeEnd) {
        setAccessibilityButtonScale(0)
      } else {
        const progress = (scrollPosition - fadeStart) / (fadeEnd - fadeStart)
        setAccessibilityButtonScale(1 - progress)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setIsLoading(true)
        const [data, ctData] = await Promise.all([getMembers(), getCoordinationTeams()])
        const visibleMembers = (data.data || []).filter((m: Member) => !m.HideProfile)
        setAllMembers(visibleMembers)
        setTotalCount(visibleMembers.length)

        // Build role map from current coordination team(s)
        const roles: Record<number, string[]> = {}
        const addRole = (id: number, role: string) => {
          if (!roles[id]) roles[id] = []
          if (!roles[id].includes(role)) roles[id].push(role)
        }
        const currentTeams = (ctData.data || []).filter((t: any) => t.IsCurrent)
        for (const team of currentTeams) {
          if (team.Coordinator?.id) addRole(team.Coordinator.id, 'Πρόεδρος')
          const members = team.Members || []
          const memberRoleLabels: Record<number, string> = {
            0: 'Υπεύθυνη Κοινότητας',
            1: 'Υπεύθυνη Επικοινωνίας',
            2: 'Υπεύθυνος Οικονομικών',
            3: 'Αντιπρόεδρος',
          }
          members.forEach((m: any, i: number) => {
            if (m?.id && memberRoleLabels[i]) addRole(m.id, memberRoleLabels[i])
          })
          if (team.Admin?.id) addRole(team.Admin.id, 'Admin')
          if (team.Comms?.id) addRole(team.Comms.id, 'Comms')
          if (team.IT?.id) addRole(team.IT.id, 'IT')
        }
        setMemberRoles(roles)
      } catch (error) {
        console.error('Error fetching members:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMembers()
  }, [])

  useEffect(() => {
    let result = [...allMembers]

    // Cool preset (γρήγορο φίλτρο από τη λωρίδα του hero)
    if (preset !== 'all') {
      const memberCities = (m: Member) => m.City?.split(',').map(c => c.trim()).filter(c => c && c !== '-') || []
      const hasCity = (m: Member, city: string) => memberCities(m).some(c => c.toLowerCase() === city)
      const isAbroad = (m: Member) => {
        const cities = memberCities(m)
        return cities.length > 0 && !cities.some(c => CITY_TO_PROVINCE[c])
      }
      if (preset === 'new') {
        const cutoff = new Date()
        cutoff.setMonth(cutoff.getMonth() - 3)
        result = result.filter(m => m.createdAt && new Date(m.createdAt) >= cutoff)
      } else if (preset === 'thessaloniki') {
        result = result.filter(m => hasCity(m, 'θεσσαλονίκη'))
      } else if (preset === 'athens') {
        result = result.filter(m => hasCity(m, 'αθήνα'))
      } else if (preset === 'rest') {
        result = result.filter(m => !hasCity(m, 'αθήνα') && !hasCity(m, 'θεσσαλονίκη') && !isAbroad(m))
      } else if (preset === 'abroad') {
        result = result.filter(m => isAbroad(m))
      }
    }

    if (searchQuery) {
      result = result.filter((member) =>
        matchesName(searchQuery, member.Name, member.EngName)
      )
    }

    const hasFieldFilter = selectedFields.length > 0
    const hasCityFilter = selectedCities.length > 0
    const hasProvinceFilter = selectedProvinces.length > 0

    if (hasFieldFilter || hasCityFilter || hasProvinceFilter) {
      result = result.filter((member) => {
        const matchesFields = !hasFieldFilter || selectedFields.some(field => doesFieldMatchFilter(member.FieldsOfWork, field))
        const matchesCities = !hasCityFilter || (() => {
          const memberCities = member.City?.split(',').map(c => c.trim().toLowerCase()) || []
          return selectedCities.some(sc => memberCities.includes(sc.toLowerCase()))
        })()
        const matchesProvinces = !hasProvinceFilter || (() => {
          const memberProvinces = member.Province?.split(',').map(p => p.trim().toLowerCase()) || []
          return selectedProvinces.some(sp => memberProvinces.includes(sp.toLowerCase()))
        })()

        if (filterLogic === 'and') {
          return matchesFields && matchesCities && matchesProvinces
        } else {
          // OR: match if member passes any of the active filter groups
          const checks: boolean[] = []
          if (hasFieldFilter) checks.push(matchesFields)
          if (hasCityFilter) checks.push(matchesCities)
          if (hasProvinceFilter) checks.push(matchesProvinces)
          return checks.some(Boolean)
        }
      })
    }

    // Apply sorting
    if (sortMode === 'alpha-asc') {
      result.sort((a, b) => a.Name.localeCompare(b.Name, 'el'))
    } else if (sortMode === 'alpha-desc') {
      result.sort((a, b) => b.Name.localeCompare(a.Name, 'el'))
    } else if (sortMode === 'random') {
      result.sort(() => Math.random() - 0.5)
    }

    setFilteredMembers(result)
  }, [allMembers, searchQuery, selectedFields, selectedCities, selectedProvinces, sortMode, filterLogic, preset])

  // Animated counter
  useEffect(() => {
    if (filteredMembers.length === 0) {
      setDisplayCount(0)
      return
    }

    let start = 0
    const end = filteredMembers.length
    const duration = 1000
    const increment = end / (duration / 16)

    const timer = setInterval(() => {
      start += increment
      if (start >= end) {
        setDisplayCount(end)
        clearInterval(timer)
      } else {
        setDisplayCount(Math.floor(start))
      }
    }, 16)

    return () => clearInterval(timer)
  }, [filteredMembers])

  // Get unique values for filters
  const uniqueCities = Array.from(
    new Set(
      allMembers.flatMap((m) =>
        m.City?.split(',').map((c) => c.trim()).filter((c) => c && c !== '-') || []
      )
    )
  ).sort((a, b) => a.localeCompare(b, 'el'))
  const uniqueProvinces = Array.from(
    new Set(
      allMembers.flatMap((m) =>
        m.Province?.split(',').map((p) => p.trim()).filter((p) => p && p !== '-') || []
      )
    )
  ).sort((a, b) => a.localeCompare(b, 'el'))

  const totalActiveFilters = selectedFields.length + selectedCities.length + selectedProvinces.length

  const clearAllFilters = () => {
    setSelectedFields([])
    setSelectedCities([])
    setSelectedProvinces([])
    setSearchQuery('')
    try { sessionStorage.removeItem(STORAGE_KEY) } catch {}
  }

  const membersWithImage = allMembers.filter(m => m.Image && m.Image.length > 0 && m.Image[0].url)
  const heroMember = membersWithImage.length > 0
    ? membersWithImage[Math.floor(heroSeed * membersWithImage.length)]
    : null

  const presetCls = (selected: boolean) =>
    `inline-flex items-center min-h-11 px-4 text-xs font-bold tracking-widest whitespace-nowrap border-b-2 transition-colors duration-200 ${
      selected ? 'text-white border-coral' : 'text-white/70 border-transparent hover:text-white'
    }`
  const MEMBER_PRESETS: Array<{ key: MembersPreset; label: string }> = [
    { key: 'new', label: 'ΝΕΑ ΜΕΛΗ' },
    { key: 'thessaloniki', label: 'ΘΕΣΣΑΛΟΝΙΚΗ' },
    { key: 'athens', label: 'ΑΘΗΝΑ' },
    { key: 'rest', label: 'ΕΚΤΟΣ ΘΕΣΣΑΛΟΝΙΚΗΣ/ΑΘΗΝΑΣ' },
    { key: 'abroad', label: 'ΕΞΩΤΕΡΙΚΟ' },
    { key: 'all', label: 'ΟΛΑ' },
  ]

  return (
    <div className="min-h-screen bg-[#F5F0EB] dark:bg-gray-900">
      <Navigation />
      <main id="main-content">
        {/* Hero Section — Cool: σκηνή με το λούσιμο/πορτρέτο του προφίλ,
            με τυχαίο μέλος σε κάθε φόρτωση, και presets στο κάτω χείλος */}
        {cool ? (
        <section className="px-2 pt-2 md:px-3">
          <div className="relative overflow-hidden rounded-3xl flex flex-col justify-end min-h-[45vh] md:min-h-[52vh]" style={{ backgroundColor: '#1B2438' }}>
            {/* Το σταθερό χρωματιστό λούσιμο — ίδια συνταγή με το hero του προφίλ */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true"
              style={{
                background:
                  'radial-gradient(90% 130% at 86% 40%, rgba(214,142,114,.8) 0%, rgba(171,104,86,.5) 38%, rgba(27,36,56,0) 68%), ' +
                  'radial-gradient(50% 80% at 70% 85%, rgba(255,139,106,.35) 0%, rgba(27,36,56,0) 70%)',
              }}
            />
            {/* Τυχαίο πορτρέτο μέλους: ασπρόμαυρο + soft-light στο δεξί 1/3,
                ξεθωριάζει από τα 2/3 — ποτέ πλήρης αποκάλυψη */}
            {heroMember && (
              <div className="absolute inset-y-0 right-0 w-1/3 pointer-events-none" aria-hidden="true"
                style={{
                  backgroundImage: `url(${heroMember.Image![0].url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center 22%',
                  filter: 'grayscale(1)',
                  mixBlendMode: 'soft-light',
                  WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,.9) 45%, rgba(0,0,0,.9) 100%)',
                  maskImage: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,.9) 45%, rgba(0,0,0,.9) 100%)',
                }}
              />
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,.08) 30%, rgba(0,0,0,.45) 100%)' }} aria-hidden="true" />
            <div className="relative px-6 md:px-12 pt-24 pb-10 md:pb-12">
              <p className="text-[11px] font-bold tracking-[.14em] uppercase text-coral">ΑΝΑΖΗΤΗΣΗ ΜΕΛΩΝ</p>
              <h1 className="text-white text-3xl md:text-5xl font-bold leading-tight mt-2 max-w-3xl">
                Οι δημιουργικοί επαγγελματίες του δικτύου
              </h1>
              <p className="text-white/70 mt-5" aria-live="polite">
                <span className="notranslate text-coral font-bold text-3xl align-middle">{displayCount}</span>
                <span className="ml-2 align-middle">μέλη με προφίλ</span>
              </p>
            </div>
            <div className="relative" style={{ backgroundColor: 'rgba(10, 14, 24, .45)', backdropFilter: 'blur(16px) saturate(170%)', WebkitBackdropFilter: 'blur(16px) saturate(170%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.12)' }}>
              <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }} role="tablist" aria-label="Γρήγορα φίλτρα μελών">
                {MEMBER_PRESETS.map(p => (
                  <button key={p.key} type="button" role="tab" aria-selected={preset === p.key} onClick={() => setPreset(p.key)} className={presetCls(preset === p.key)}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
        ) : (
        <section className="relative -bottom-20">
          <div className="bg-coral dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 h-[25vh] flex items-center rounded-b-3xl relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-none dark:text-coral">
                ΑΝΑΖΗΤΗΣΗ<br />ΜΕΛΩΝ
              </h1>
            </div>

            {/* Accessibility Menu Trigger Button */}
            <div
              className="absolute right-6 lg:right-12 top-1/2 -translate-y-1/2 transition-all duration-200"
              style={{
                transform: `translateY(-50%) scale(${accessibilityButtonScale})`,
                opacity: accessibilityButtonScale,
                pointerEvents: accessibilityButtonScale < 0.1 ? 'none' : 'auto'
              }}
            >
              <AccessibilityButton />
            </div>
          </div>
        </section>
        )}

      {/* Main Content */}
      <section className={cool ? 'pt-10 pb-24' : 'pt-32 pb-24'}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Loading Indicator */}
          {isLoading && <LoadingIndicator />}

          {/* Info Box — στο Cool ο μετρητής ζει μέσα στο hero */}
          {!cool && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 mb-12">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Ένα αποθετήριο εξαιρετικών δημιουργικών επαγγελματιών, έργων και ιδεών που προάγουν την κοινωνικοπολιτιστική καινοτομία μέσω πρωτοβουλιών με κινητήρια δύναμη τον άνθρωπο.
              </p>
              <div className="shrink-0">
                <div className="bg-white dark:bg-gray-700 px-6 py-3 rounded-full border-2 border-charcoal dark:border-gray-400 inline-block">
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-200 whitespace-nowrap">Μέλη: <span className="text-coral dark:text-coral-light">{displayCount}</span></p>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Filters */}
          {/* Χωρίς overflow-hidden: έκοβε τα ανοιχτά dropdowns των φίλτρων —
              το logo-reveal κόβεται με δικό του rounded αντί για clipping */}
          <div className={cool ? 'relative menu-glass glass-rim rounded-3xl p-8 mb-12' : 'bg-white dark:bg-gray-800 rounded-3xl p-8 mb-12'}>
            {cool && <span className="logo-reveal rounded-3xl overflow-hidden" aria-hidden="true" />}
            <div className={cool ? 'relative flex flex-wrap items-center gap-3' : 'flex flex-wrap items-center gap-3'}>
              <input
                type="text"
                placeholder="Αναζήτηση / Search name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-[140px] max-w-[200px] px-4 py-3 border border-charcoal dark:border-gray-400 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-coral dark:bg-gray-700 dark:text-gray-200 placeholder-charcoal dark:placeholder-gray-200"
              />
              <FieldsFilter
                selectedFields={selectedFields}
                onSelectionChange={setSelectedFields}
              />
              <CityFilter
                cities={uniqueCities}
                selectedCities={selectedCities}
                onSelectionChange={setSelectedCities}
              />
              <ProvinceFilter
                provinces={uniqueProvinces}
                selectedProvinces={selectedProvinces}
                onSelectionChange={setSelectedProvinces}
              />
              <SortFilter
                sortMode={sortMode}
                onSortChange={setSortMode}
              />
              {/* AND/OR Toggle */}
              <div className="relative group">
                <div className="flex rounded-full border border-charcoal dark:border-gray-400 overflow-hidden">
                  <button
                    onClick={() => setFilterLogic('and')}
                    className={`px-3 py-3 text-xs font-medium transition-colors ${
                      filterLogic === 'and'
                        ? 'bg-charcoal dark:bg-gray-100 text-white dark:text-gray-900'
                        : 'text-charcoal dark:text-gray-200 hover:bg-charcoal/10 dark:hover:bg-gray-600'
                    }`}
                  >
                    AND
                  </button>
                  <button
                    onClick={() => setFilterLogic('or')}
                    className={`px-3 py-3 text-xs font-medium transition-colors border-l border-charcoal dark:border-gray-400 ${
                      filterLogic === 'or'
                        ? 'bg-charcoal dark:bg-gray-100 text-white dark:text-gray-900'
                        : 'text-charcoal dark:text-gray-200 hover:bg-charcoal/10 dark:hover:bg-gray-600'
                    }`}
                  >
                    OR
                  </button>
                </div>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-charcoal dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50">
                  {filterLogic === 'and'
                    ? 'AND: Εμφάνιση μελών που ταιριάζουν σε όλα τα φίλτρα'
                    : 'OR: Εμφάνιση μελών που ταιριάζουν σε οποιοδήποτε φίλτρο'
                  }
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-charcoal dark:border-t-gray-100" />
                </div>
              </div>
              {/* Reset All */}
              {totalActiveFilters > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="px-3 py-3 text-xs font-medium text-coral dark:text-coral-light hover:underline whitespace-nowrap"
                >
                  Καθαρισμός όλων των φίλτρων ({totalActiveFilters})
                </button>
              )}
              <ViewToggle view={viewMode} onViewChange={setViewMode} />
            </div>
          </div>

          {/* Members Grid/List */}
          {viewMode === 'grid' ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredMembers.map((member) => (
                <MemberFlipCard key={member.id} member={member} role={memberRoles[member.id]?.join(' · ')} cool={cool} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredMembers.map((member) => (
                <Link
                  key={member.id}
                  href={`/members/${member.Slug}`}
                  className={cool
                    ? 'menu-glass rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300 group border-l-4 border-transparent hover:border-coral dark:hover:border-coral-light flex items-center gap-5 p-4'
                    : 'bg-white dark:bg-gray-800 rounded-3xl overflow-hidden hover:shadow-xl dark:hover:shadow-gray-700/50 transition-all duration-300 group border-l-4 border-transparent hover:border-coral dark:hover:border-coral-light flex items-center gap-5 p-4'}
                >
                  {member.Image && member.Image.length > 0 && member.Image[0].url ? (
                    <div className="w-16 h-16 relative bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex-shrink-0">
                      <Image
                        src={member.Image[0].url}
                        alt={member.ProfileImageAltText || member.Name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-gray-400 dark:text-gray-500 text-xl">{member.Name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-light group-hover:font-bold text-charcoal dark:text-gray-100 transition-all">
                        <LocalizedText text={member.Name} engText={member.EngName} />
                      </h3>
                      {memberRoles[member.id] && (
                        <span className="bg-charcoal text-white dark:bg-white dark:text-charcoal text-[10px] font-medium px-2 py-0.5 rounded-full">
                          {memberRoles[member.id].join(' · ')}
                        </span>
                      )}
                    </div>
                    <div className="inline-block bg-coral/10 dark:bg-coral/20 text-charcoal dark:text-gray-100 border border-charcoal dark:border-gray-400 text-xs px-3 py-1 rounded-2xl tracking-wide max-w-full">
                      <p className="line-clamp-1">{member.FieldsOfWork}</p>
                    </div>
                  </div>
                  {member.City && member.City !== '-' && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap hidden sm:block">{member.City}</span>
                  )}
                </Link>
              ))}
            </div>
          )}

          {filteredMembers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">Δεν βρέθηκαν μέλη με τα επιλεγμένα κριτήρια.</p>
            </div>
          )}
        </div>
      </section>
      {cool ? <CoolMemberBand /> : <CombinedCtaSection />}
      </main>
      <Footer variant="members" />
      <CookieConsent />
      <ScrollToTop />
    </div>
  )
}
