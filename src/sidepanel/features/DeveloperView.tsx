/**
 * Developer / about tab: author profile and link to the project repository.
 */
import { useState, type SVGProps } from 'react'
import { Globe, MapPin, Star } from 'lucide-react'

export const REPO_URL = 'https://github.com/rahmat058/page-2-design'

/** Prefer the loaded extension manifest so the UI matches chrome://extensions. */
function appVersion(): string {
  try {
    return chrome.runtime.getManifest().version || '1.0.0'
  } catch {
    return '1.0.0'
  }
}

const PROFILE = {
  name: 'Kazi Rahamatullah',
  handle: '@rahmat058',
  role: 'Frontend & JAMstack developer',
  tagline: 'Building Modern Web Experiences',
  location: 'Dhaka, Bangladesh',
  avatar: 'https://github.com/rahmat058.png?size=160',
} as const

const ABOUT = [
  "I'm a frontend-focused developer with more than five years of experience building production JAMstack apps for startups, agencies, and growing businesses. My strongest work is in React, Next.js, Vue, Nuxt, TypeScript, and JavaScript.",
  'I turn Figma designs and product requirements into accessible, fast interfaces, and I wire them to headless CMS platforms like Prismic, Contentful, and Sanity. I have shipped SaaS products, e-commerce, dashboards, marketing sites, and design systems — including reusable components, API integrations, and page-load improvements of up to 25%.',
  'I care about the details that make a frontend reliable: responsive layouts, reusable architecture, accessibility, web performance, clear loading and error states, and testing important user journeys.',
]

const TOOLKIT = [
  'React',
  'Next.js',
  'Vue',
  'Nuxt',
  'TypeScript',
  'JavaScript',
  'JAMstack',
  'Prismic',
  'Contentful',
  'Sanity',
  'Tailwind CSS',
  'Redux Toolkit',
  'TanStack Query',
  'Vercel',
  'Cypress',
  'Playwright',
]

const OPEN_TO_WORK =
  "I'm open to frontend engineering, JAMstack, React, Next.js, Vue, and Nuxt roles — especially teams shipping useful products with a modern headless CMS."

const ICON = { size: 16, strokeWidth: 1.75 } as const

function BrandIcon({ children, size = 16, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      {children}
    </svg>
  )
}

function GithubMark(props: { size?: number }) {
  return (
    <BrandIcon {...props}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </BrandIcon>
  )
}

function LinkedinMark(props: { size?: number }) {
  return (
    <BrandIcon {...props}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </BrandIcon>
  )
}

const LINKS = [
  { href: 'https://github.com/rahmat058', label: 'GitHub', hint: 'rahmat058', Icon: GithubMark },
  { href: 'https://www.linkedin.com/in/rahmat058/', label: 'LinkedIn', hint: 'in/rahmat058', Icon: LinkedinMark },
  { href: 'https://www.kazi-rahamatullah.com/', label: 'Website', hint: 'kazi-rahamatullah.com', Icon: Globe },
] as const

export function DeveloperView() {
  const [avatarFailed, setAvatarFailed] = useState(false)
  const version = appVersion()

  return (
    <article className="dev-page">
      <div className="dev-app-badge" aria-label={`Page2Design version ${version}`}>
        <div className="dev-app-badge-copy">
          <span className="dev-app-name">Page2Design</span>
          <small>Chrome extension</small>
        </div>
        <span className="dev-version-pill">
          <span className="dev-version-label">Version</span>
          <strong>v{version}</strong>
        </span>
      </div>

      <header className="dev-identity">
        {avatarFailed ? (
          <span className="dev-avatar fallback" aria-hidden="true">
            KR
          </span>
        ) : (
          <img
            className="dev-avatar"
            src={PROFILE.avatar}
            alt=""
            width={64}
            height={64}
            onError={() => setAvatarFailed(true)}
          />
        )}
        <div className="dev-identity-copy">
          <h2>{PROFILE.name}</h2>
          <p className="dev-handle">{PROFILE.handle}</p>
          <p className="dev-role">{PROFILE.role}</p>
          <p className="dev-meta">
            <MapPin size={12} strokeWidth={2} aria-hidden="true" />
            {PROFILE.location}
            <span className="dev-open-pill">Open to work</span>
          </p>
        </div>
      </header>

      <p className="dev-tagline">{PROFILE.tagline}</p>

      <a className="dev-link star" href={REPO_URL} target="_blank" rel="noopener noreferrer">
        <Star {...ICON} aria-hidden="true" />
        <span>
          <strong>Star this repo</strong>
          <small>github.com/rahmat058/page-2-design</small>
        </span>
      </a>

      <div className="dev-links">
        {LINKS.map((link) => (
          <a key={link.href} className="dev-link" href={link.href} target="_blank" rel="noopener noreferrer">
            <link.Icon size={ICON.size} />
            <span>
              <strong>{link.label}</strong>
              <small>{link.hint}</small>
            </span>
          </a>
        ))}
      </div>

      <section className="dev-section">
        <h3>About</h3>
        {ABOUT.map((paragraph) => (
          <p key={paragraph.slice(0, 32)}>{paragraph}</p>
        ))}
      </section>

      <section className="dev-section">
        <h3>Toolkit</h3>
        <ul className="dev-chips">
          {TOOLKIT.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="dev-section dev-open">
        <h3>Open to opportunities</h3>
        <p>{OPEN_TO_WORK}</p>
      </section>
    </article>
  )
}
