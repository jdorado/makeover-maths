// The same Clerk browser bootstrap and explicit return URLs as Cloudkeepers.
export interface ParentAuth {
  readonly userId: string | null;
  getToken(): Promise<string | null>;
  onChange(handler: (id: string | null) => void): () => void;
  signIn(): void;
  signOut(): Promise<void>;
}
type ClerkClient = { user?: { id: string }; session?: { getToken(): Promise<string | null> }; load(options: unknown): Promise<void>; addListener(callback: () => void): () => void; openSignIn(options: unknown): void; signOut(): Promise<void> }
declare global { interface Window { Clerk: ClerkClient; __internal_ClerkUICtor: unknown } }
function loadScript(src: string, publishableKey?: string) {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script'); script.src = src; script.crossOrigin = 'anonymous'
    if (publishableKey) script.dataset.clerkPublishableKey = publishableKey
    script.onload = () => resolve(); script.onerror = () => reject(new Error('Parent sign-in could not load. Guest play is available.')); document.head.append(script)
  })
}
let setup: Promise<ParentAuth> | undefined
export function setupParentAuth(): Promise<ParentAuth> {
  setup ??= (async () => {
    const response = await fetch('/api/config')
    if (!response.ok) throw new Error('Parent sign-in is unavailable. You can play as a guest.')
    const config = await response.json()
    if (!config.cloudEnabled || config.appId !== 'makeover-maths' || config.authProvider !== 'google') throw new Error('Online saves are not configured. Guest play stays on this device.')
    const domain = atob(config.publishableKey.split('_')[2]).replace(/\$$/, '')
    if (!/^[a-z0-9.-]+$/i.test(domain)) throw new Error('Invalid parent sign-in configuration.')
    await loadScript(`https://${domain}/npm/@clerk/ui@1/dist/ui.browser.js`)
    await loadScript(`https://${domain}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`, config.publishableKey)
    const clerk = window.Clerk; await clerk.load({ ui: { ClerkUI: window.__internal_ClerkUICtor } })
    return { get userId() { return clerk.user?.id ?? null }, getToken: async () => clerk.session?.getToken() ?? null,
      onChange(handler: (id: string | null) => void) { return clerk.addListener(() => handler(clerk.user?.id ?? null)) },
      signIn() { clerk.openSignIn({ forceRedirectUrl: window.location.origin, signUpForceRedirectUrl: window.location.origin }) },
      async signOut() { await clerk.signOut() } }
  })()
  return setup
}
