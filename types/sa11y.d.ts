declare module 'sa11y/dist/js/sa11y.esm.min.js' {
  export class Sa11y {
    constructor(options?: Record<string, unknown>)
  }
  export const Lang: {
    addI18n: (strings: Record<string, string>) => void
  }
}

declare module 'sa11y/dist/js/lang/el.js' {
  const lang: {
    strings: Record<string, string>
  }
  export default lang
}
