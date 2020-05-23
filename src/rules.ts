export interface Rule {
  readonly selector: string
  readonly type: 'redirect' | 'content'
}


export const DefaultRules = new Map<string, Rule>([
  [
    "reddit.com", {
      selector: 'div[data-test-id=post-content] .styled-outbound-link',
      type: 'redirect'
    }
  ],
])
