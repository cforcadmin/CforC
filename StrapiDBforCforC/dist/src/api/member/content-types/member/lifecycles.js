"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Greek to Latin transliteration map
 */
const greekToLatinMap = {
    'α': 'a', 'ά': 'a', 'Α': 'A', 'Ά': 'A',
    'β': 'b', 'Β': 'B',
    'γ': 'g', 'Γ': 'G',
    'δ': 'd', 'Δ': 'D',
    'ε': 'e', 'έ': 'e', 'Ε': 'E', 'Έ': 'E',
    'ζ': 'z', 'Ζ': 'Z',
    'η': 'i', 'ή': 'i', 'Η': 'I', 'Ή': 'I',
    'θ': 'th', 'Θ': 'TH',
    'ι': 'i', 'ί': 'i', 'ϊ': 'i', 'ΐ': 'i', 'Ι': 'I', 'Ί': 'I', 'Ϊ': 'I',
    'κ': 'k', 'Κ': 'K',
    'λ': 'l', 'Λ': 'L',
    'μ': 'm', 'Μ': 'M',
    'ν': 'n', 'Ν': 'N',
    'ξ': 'ks', 'Ξ': 'KS',
    'ο': 'o', 'ό': 'o', 'Ο': 'O', 'Ό': 'O',
    'π': 'p', 'Π': 'P',
    'ρ': 'r', 'Ρ': 'R',
    'σ': 's', 'ς': 's', 'Σ': 'S',
    'τ': 't', 'Τ': 'T',
    'υ': 'y', 'ύ': 'y', 'ϋ': 'y', 'ΰ': 'y', 'Υ': 'Y', 'Ύ': 'Y', 'Ϋ': 'Y',
    'φ': 'f', 'Φ': 'F',
    'χ': 'ch', 'Χ': 'CH',
    'ψ': 'ps', 'Ψ': 'PS',
    'ω': 'o', 'ώ': 'o', 'Ω': 'O', 'Ώ': 'O',
    // Special combinations
    'αι': 'ai', 'Αι': 'Ai', 'ΑΙ': 'AI',
    'ει': 'ei', 'Ει': 'Ei', 'ΕΙ': 'EI',
    'οι': 'oi', 'Οι': 'Oi', 'ΟΙ': 'OI',
    'ου': 'ou', 'Ου': 'Ou', 'ΟΥ': 'OU',
    'αυ': 'av', 'Αυ': 'Av', 'ΑΥ': 'AV',
    'ευ': 'ev', 'Ευ': 'Ev', 'ΕΥ': 'EV',
    'ηυ': 'iv', 'Ηυ': 'Iv', 'ΗΥ': 'IV',
    'μπ': 'b', 'Μπ': 'B', 'ΜΠ': 'B',
    'ντ': 'd', 'Ντ': 'D', 'ΝΤ': 'D',
    'γκ': 'g', 'Γκ': 'G', 'ΓΚ': 'G',
    'γγ': 'ng', 'Γγ': 'Ng', 'ΓΓ': 'NG',
    'τσ': 'ts', 'Τσ': 'Ts', 'ΤΣ': 'TS',
    'τζ': 'tz', 'Τζ': 'Tz', 'ΤΖ': 'TZ',
};
/**
 * Transliterate Greek text to Latin characters
 */
function transliterate(text) {
    let result = text;
    // Replace multi-character combinations first
    const multiChar = ['αι', 'ει', 'οι', 'ου', 'αυ', 'ευ', 'ηυ', 'μπ', 'ντ', 'γκ', 'γγ', 'τσ', 'τζ', 'θ', 'χ', 'ψ', 'ξ'];
    multiChar.forEach(combo => {
        const regex = new RegExp(combo, 'gi');
        result = result.replace(regex, (match) => greekToLatinMap[match] || match);
    });
    // Replace single characters
    result = result.split('').map(char => greekToLatinMap[char] || char).join('');
    return result;
}
/**
 * Generate URL-friendly slug from name
 */
function generateSlug(name) {
    // Transliterate Greek to Latin
    let slug = transliterate(name);
    // Convert to lowercase
    slug = slug.toLowerCase();
    // Replace spaces and special characters with hyphens
    slug = slug
        .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    return slug;
}
/**
 * Lifecycle hooks for Member content type
 */
exports.default = {
    async beforeCreate(event) {
        const { data } = event.params;
        // Auto-generate slug from Name if not provided
        if (data.Name && !data.Slug) {
            data.Slug = generateSlug(data.Name);
        }
    },
    // Temporarily disabled to fix image migration issues
    // async beforeUpdate(event) {
    //   const { data } = event.params
    //   // Only regenerate slug if Name is explicitly being updated in this request
    //   if ('Name' in data && data.Name) {
    //     const newSlug = generateSlug(data.Name)
    //     // Only update if slug is empty or matches the old auto-generated pattern
    //     if (!data.Slug) {
    //       data.Slug = newSlug
    //     }
    //   }
    // },
    async afterUpdate(event) {
        // Empty hook - just here for debugging
    },
};
