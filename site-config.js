const FONT_OPTIONS = {
  'satoshi': {
    label: 'Satoshi (LogiHub)',
    family: "'Satoshi', ui-sans-serif, system-ui, sans-serif",
    google: null,
    cdn: 'https://fonts.cdnfonts.com/css/satoshi'
  },
  'dm-sans': {
    label: 'DM Sans',
    family: "'DM Sans', sans-serif",
    google: 'DM+Sans:wght@400;500;600;700'
  },
  'plus-jakarta': {
    label: 'Plus Jakarta Sans',
    family: "'Plus Jakarta Sans', sans-serif",
    google: 'Plus+Jakarta+Sans:wght@400;500;600;700'
  },
  'outfit': {
    label: 'Outfit',
    family: "'Outfit', sans-serif",
    google: 'Outfit:wght@400;500;600;700'
  },
  'sora': {
    label: 'Sora',
    family: "'Sora', sans-serif",
    google: 'Sora:wght@400;500;600;700'
  },
  'manrope': {
    label: 'Manrope',
    family: "'Manrope', sans-serif",
    google: 'Manrope:wght@400;500;600;700'
  }
};

const DEFAULT_SITE = {
  brandName: 'Centro de Ayuda LogiHub',
  logoUrl: null,
  fontFamily: 'satoshi'
};

function fontGoogleUrl(key) {
  const font = FONT_OPTIONS[key] || FONT_OPTIONS[DEFAULT_SITE.fontFamily];
  if (font.cdn) return font.cdn;
  return `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`;
}

function fontFamilyCss(key) {
  const font = FONT_OPTIONS[key] || FONT_OPTIONS[DEFAULT_SITE.fontFamily];
  return font.family;
}

module.exports = { FONT_OPTIONS, DEFAULT_SITE, fontGoogleUrl, fontFamilyCss };
