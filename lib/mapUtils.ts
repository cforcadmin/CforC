/**
 * Map utility functions: aggregate members by location, derive colors.
 */

import { CITY_TO_PROVINCE } from './greekCities'
import { NUTS_TO_PROVINCE, CITY_COORDINATES, getColorIndex, CHOROPLETH_COLORS_LIGHT, CHOROPLETH_COLORS_DARK } from './mapData'

export interface MapMember {
  id: number
  documentId: string
  Name: string
  Slug: string
  City?: string
  Province?: string
  FieldsOfWork?: string
  Image?: Array<{
    url: string
    formats?: {
      thumbnail?: { url: string }
      small?: { url: string }
    }
  }>
  HideProfile?: boolean
}

export interface CityCluster {
  city: string
  province: string
  coords: [number, number]
  members: MapMember[]
}

export interface ProvinceData {
  name: string
  nutsId: string
  count: number
  cities: Record<string, MapMember[]>
}

export interface AggregatedMapData {
  provinceMap: Record<string, ProvinceData>
  foreignMembers: CityCluster[]
  membersWithoutCity: MapMember[]
}

/**
 * Place a single city into the province map or foreign bucket.
 * Returns true if placed, false if unrecognized.
 */
function placeCity(
  city: string,
  member: MapMember,
  provinceMap: Record<string, ProvinceData>,
  foreignCities: Record<string, MapMember[]>,
): boolean {
  // Check if it's a known Greek city
  const provinces = CITY_TO_PROVINCE[city]
  if (provinces && provinces.length > 0) {
    const province = provinces[0]
    if (provinceMap[province]) {
      provinceMap[province].count++
      if (!provinceMap[province].cities[city]) provinceMap[province].cities[city] = []
      provinceMap[province].cities[city].push(member)
      return true
    }
    // Province name from greekCities.ts may not exactly match NUTS key — fuzzy match
    const match = Object.keys(provinceMap).find(p => p.includes(province) || province.includes(p))
    if (match) {
      provinceMap[match].count++
      if (!provinceMap[match].cities[city]) provinceMap[match].cities[city] = []
      provinceMap[match].cities[city].push(member)
      return true
    }
  }

  // Check if it's a foreign city with known coordinates (not in greekCities)
  if (CITY_COORDINATES[city] && !provinces) {
    if (!foreignCities[city]) foreignCities[city] = []
    foreignCities[city].push(member)
    return true
  }

  return false
}

/**
 * Aggregate members by province and city for map display.
 * - City field is comma-separated; first city = primary (used for province count)
 * - All cities are placed on the map (a member can appear in multiple cities)
 * - Filters out HideProfile members
 */
export function aggregateMembersByLocation(members: MapMember[]): AggregatedMapData {
  const provinceMap: Record<string, ProvinceData> = {}
  const foreignCities: Record<string, MapMember[]> = {}
  const membersWithoutCity: MapMember[] = []

  // Initialize province map from NUTS mapping
  for (const [nutsId, provinceName] of Object.entries(NUTS_TO_PROVINCE)) {
    provinceMap[provinceName] = {
      name: provinceName,
      nutsId,
      count: 0,
      cities: {},
    }
  }

  for (const member of members) {
    if (member.HideProfile) continue

    const raw = member.City?.trim()
    if (!raw || raw === '-') {
      membersWithoutCity.push(member)
      continue
    }

    // Split comma-separated cities
    const cities = raw.split(',').map(c => c.trim()).filter(c => c && c !== '-')
    if (cities.length === 0) {
      membersWithoutCity.push(member)
      continue
    }

    // Place every city the member has listed
    let placedAny = false
    for (const city of cities) {
      const placed = placeCity(city, member, provinceMap, foreignCities)
      if (placed) placedAny = true
    }

    if (!placedAny) {
      membersWithoutCity.push(member)
    }
  }

  // Convert foreign cities to clusters
  const foreignMembers: CityCluster[] = Object.entries(foreignCities).map(([city, mems]) => ({
    city,
    province: 'Εξωτερικό',
    coords: CITY_COORDINATES[city],
    members: mems,
  }))

  return { provinceMap, foreignMembers, membersWithoutCity }
}

/** Get choropleth fill color for a province */
export function getProvinceColor(count: number, isDarkMode: boolean): string {
  const idx = getColorIndex(count)
  return isDarkMode ? CHOROPLETH_COLORS_DARK[idx] : CHOROPLETH_COLORS_LIGHT[idx]
}

/** Get member thumbnail URL */
export function getMemberThumbnail(member: MapMember): string | null {
  if (!member.Image || member.Image.length === 0) return null
  const img = member.Image[0]
  const url = img.formats?.thumbnail?.url || img.formats?.small?.url || img.url
  return url?.startsWith('http') ? url : null
}
