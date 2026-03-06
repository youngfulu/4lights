# 4lights refactored

React-оболочка для 4lights: тот же UI и логика (canvas, грид, фильтры), разметка рендерится через React, скрипты подключаются после монтирования.

## Зависимости index.html

См. `INDEX_DEPENDENCIES.md`: список файлов и ресурсов, необходимых для работы приложения.

## Запуск

```bash
npm install
npm run dev
```

Откройте http://localhost:5173

## Сборка

```bash
npm run build
```

Результат в папке `dist/`. Перед сборкой автоматически запускается компрессия изображений для грида (если установлен `sharp`).

## Компрессия изображений

Скрипт сжимает JPG/PNG в папках `final images` и `public/final images` (для ускорения загрузки random grid):

```bash
npm run compress-images
```

Требуется `sharp` (ставится с `npm install`).

## Как пользоваться дальше

- **Регенерация списка картинок** (из референса, без папок `0_`):
  ```bash
  node scripts/generate-image-list.js
  ```

- **Повторное слияние оригиналов** (из `~/Desktop/4ligths content` и `4lights-originals-restore/original source`, при совпадении путей остаётся файл с большим размером):
  ```bash
  node scripts/merge-originals.js
  ```

- **Обновление хайрезов в public** (копирование оригиналов в `public/final images/.../highres/` для selection mode):
  ```bash
  node scripts/sync-highres-from-originals.js
  ```

- **Синхронизация about.txt и more.txt** из референса в папки проектов в `public/final images`:
  ```bash
  node scripts/sync-about-more.js
  ```

Vite и деплой могут брать картинки из корня (`final images`) или из `public/final images`; при необходимости обнови `vite.config.js`, чтобы источник изображений совпадал с референсом.

## Структура

- `src/App.jsx` — React-разметка (те же id/классы, что и в оригинальном index.html).
- `public/script.js`, `public/about.js` — логика приложения и текст «We are».
- `public/final images/` — изображения для грида (копия из корня).

План рефакторинга с Repository pattern описан в `REFACTOR_PLAN.md`.
