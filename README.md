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

Скрипт сжимает JPG/PNG в папках `Imgae test ` и `public/Imgae test ` (для ускорения загрузки random grid):

```bash
npm run compress-images
```

Требуется `sharp` (ставится с `npm install`).

## Структура

- `src/App.jsx` — React-разметка (те же id/классы, что и в оригинальном index.html).
- `public/script.js`, `public/about.js` — логика приложения и текст «We are».
- `public/Imgae test /` — изображения для грида (копия из корня).

План рефакторинга с Repository pattern описан в `REFACTOR_PLAN.md`.
