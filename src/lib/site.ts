/**
 * Site-wide data shared by the terminal chrome and the pages that list it.
 * Keeping nav, contacts and projects here means the homepage's summary cards
 * and the dedicated pages can never disagree with each other.
 */

export interface NavLink {
  href: string;
  label: string;
}

export const NAV_LINKS: NavLink[] = [
  { href: '/blog/', label: 'Блог' },
  { href: '/projects/', label: 'Проекты' },
  { href: '/about/', label: 'Обо мне' }
];

export interface Contact {
  name: string;
  href: string;
  /** Shown on the contact list of /about/, omitted in the compact footer. */
  handle: string;
}

export const CONTACTS: Contact[] = [
  { name: 'Telegram', href: 'https://t.me/gl_epka', handle: '@gl_epka' },
  { name: 'GitHub', href: 'https://github.com/gl-epka', handle: 'gl-epka' },
  { name: 'Pinterest', href: 'https://pin.it/1SE4BPSSJ', handle: 'gl_epka' },
  { name: 'ИТД', href: 'https://xn--d1ah4a.com/@gl_epka', handle: '@gl_epka' }
];

/** The three contacts the footer shows; the rest live on /about/. */
export const FOOTER_CONTACTS = CONTACTS.filter((contact) => contact.name !== 'ИТД');

export interface Project {
  num: string;
  name: string;
  /** One line, used on the homepage card. */
  desc: string;
  /** Fuller copy, used on /projects/ only. */
  long: string;
  tags: string[];
  year: string;
  status: string;
  /** Optional — a project without a public link renders as a plain card. */
  href?: string;
  external?: boolean;
  /** Shown as a `repo:` meta row on /projects/. */
  repo?: string;
  /** Featured projects are the ones the homepage lists. */
  featured?: boolean;
}

export const PROJECTS: Project[] = [
  {
    num: '01',
    name: 'Shiki Cards Bot',
    desc: 'Бот, который собирает карточки из аниме-базы.',
    long: 'Телеграм-бот, который тянет данные из аниме-базы и собирает из них коллекционные карточки. Живёт в контейнере на домашнем сервере, обновляется из GitHub Actions.',
    tags: ['telegram', 'open source'],
    year: '2026',
    status: 'в работе',
    href: 'https://github.com/glepzilla/shiki-cards-bot',
    external: true,
    repo: 'glepzilla/shiki-cards-bot',
    featured: true
  },
  {
    num: '02',
    name: 'Этот сайт',
    desc: 'Статика на Astro и папка с markdown-файлами.',
    long: 'Статический сайт на Astro: записи — обычные markdown-файлы в репозитории. Собирается в Docker-образ, разворачивается на своём сервере за Traefik.',
    tags: ['astro', 'markdown', 'docker'],
    year: '2026',
    status: 'живёт',
    href: 'https://github.com/glepzilla/glepzilla.github.io',
    external: true,
    repo: 'glepzilla/glepzilla.github.io',
    featured: true
  },
  {
    num: '03',
    name: 'Домашний сервер',
    desc: 'Прометей, Графана и стопка контейнеров дома.',
    long: 'Небольшой homelab: Prometheus, Grafana, Loki и Alertmanager смотрят за сервером и за тем, что на нём развёрнуто. Полигон для всего остального.',
    tags: ['prometheus', 'grafana', 'docker'],
    year: '2025—',
    status: 'работает'
  },
  {
    num: '04',
    name: 'Design system',
    desc: 'Токены, фоны и типографика для своих проектов.',
    long: 'Общий набор токенов, живых фонов на canvas и типографики, из которого собраны сайты. Фоновый движок этой страницы приехал оттуда.',
    tags: ['css', 'canvas'],
    year: '2026',
    status: 'растёт'
  }
];

export const FEATURED_PROJECTS = PROJECTS.filter((project) => project.featured);
