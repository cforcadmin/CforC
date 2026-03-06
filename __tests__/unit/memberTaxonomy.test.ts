import {
  isSplittable,
  isHinted,
  getSubLabel,
  getSubDisplayLabel,
  isKnownTaxonomyValue,
  doesFieldMatchFilter,
  type SplittableSubcategory,
  type HintedSubcategory,
} from '@/lib/memberTaxonomy'

describe('memberTaxonomy', () => {
  const splittable: SplittableSubcategory = {
    label: 'Θέατρο / Χορός / Performing Arts',
    options: ['Θέατρο', 'Χορός', 'Performing Arts'],
  }

  const hinted: HintedSubcategory = {
    label: 'Θεραπευτικές Πρακτικές',
    hint: '(π.χ. Χοροθεραπεία ή Φωτοθεραπεία ή Ψυχοθεραπεία)',
  }

  describe('type guards', () => {
    it('isSplittable identifies splittable', () => {
      expect(isSplittable(splittable)).toBe(true)
      expect(isSplittable(hinted)).toBe(false)
      expect(isSplittable('plain')).toBe(false)
    })

    it('isHinted identifies hinted', () => {
      expect(isHinted(hinted)).toBe(true)
      expect(isHinted(splittable)).toBe(false)
      expect(isHinted('plain')).toBe(false)
    })
  })

  describe('getSubLabel', () => {
    it('returns string for plain', () => {
      expect(getSubLabel('Φωτογραφία')).toBe('Φωτογραφία')
    })

    it('returns label for splittable', () => {
      expect(getSubLabel(splittable)).toBe('Θέατρο / Χορός / Performing Arts')
    })

    it('returns label for hinted', () => {
      expect(getSubLabel(hinted)).toBe('Θεραπευτικές Πρακτικές')
    })
  })

  describe('getSubDisplayLabel', () => {
    it('returns label + hint for hinted', () => {
      expect(getSubDisplayLabel(hinted)).toContain('Θεραπευτικές Πρακτικές')
      expect(getSubDisplayLabel(hinted)).toContain('(π.χ.')
    })

    it('returns plain label for non-hinted', () => {
      expect(getSubDisplayLabel('Φωτογραφία')).toBe('Φωτογραφία')
    })
  })

  describe('isKnownTaxonomyValue', () => {
    it('matches a category', () => {
      expect(isKnownTaxonomyValue('Εκπαίδευση & Μάθηση')).toBe(true)
    })

    it('matches a plain subcategory', () => {
      expect(isKnownTaxonomyValue('Φωτογραφία')).toBe(true)
    })

    it('matches a splittable full label', () => {
      expect(isKnownTaxonomyValue('Θέατρο / Χορός / Performing Arts')).toBe(true)
    })

    it('matches a splittable partial combination', () => {
      expect(isKnownTaxonomyValue('Θέατρο / Χορός')).toBe(true)
    })

    it('rejects unknown value', () => {
      expect(isKnownTaxonomyValue('Ζωγραφική σε ύφασμα')).toBe(false)
    })
  })

  describe('doesFieldMatchFilter', () => {
    it('matches exact subcategory', () => {
      expect(doesFieldMatchFilter('Φωτογραφία, Placemaking', 'Φωτογραφία')).toBe(true)
    })

    it('matches category filter (any sub matches)', () => {
      expect(doesFieldMatchFilter('Φωτογραφία', 'Τέχνες & Πολιτισμός')).toBe(true)
    })

    it('matches splittable option inside member tag', () => {
      expect(doesFieldMatchFilter('Θέατρο / Χορός', 'Θέατρο')).toBe(true)
    })

    it('returns false for empty inputs', () => {
      expect(doesFieldMatchFilter('', 'Φωτογραφία')).toBe(false)
      expect(doesFieldMatchFilter('Φωτογραφία', '')).toBe(false)
    })

    it('returns false for non-matching filter', () => {
      expect(doesFieldMatchFilter('Φωτογραφία', 'Αρχιτεκτονική')).toBe(false)
    })
  })
})
