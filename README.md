# glepzilla

Личный сайт и блог Глеба на [glepzilla.ru](https://glepzilla.ru). Собран на Astro, оформлен по локальному `glepzilla-design-system` и публикуется на GitHub Pages.

## Локальный запуск

```sh
npm install
npm run dev
```

Проверка production-сборки:

```sh
npm run build
npm run preview
```

## Как добавить запись

1. Создайте файл `src/content/blog/my-post.md`.
2. Добавьте метаданные и текст:

```md
---
title: «Название записи»
description: Короткое описание для списка и поисковиков.
published: 2026-07-14
tags: [мысли, инструменты]
draft: false
---

Текст записи в Markdown.
```

3. Запустите `npm run build`.
4. Закоммитьте и отправьте изменения в `main` — GitHub Actions опубликует сайт автоматически.

Черновики с `draft: true` не попадают на сайт и в RSS.

## Структура

- `src/content/blog/` — записи блога;
- `src/pages/` — страницы сайта;
- `src/components/` — переиспользуемые компоненты;
- `src/styles/global.css` — токены и базовые стили из UI kit;
- `.github/workflows/deploy.yml` — публикация в GitHub Pages.
