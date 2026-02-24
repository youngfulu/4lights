# Зависимости index.html — список необходимых файлов

## 1. Файлы, подключаемые напрямую в index.html

| Файл | Назначение |
|------|------------|
| `style.css` | Стили: canvas, loading, кнопки, about, фильтры, мобильная навигация |
| `images.js` | Подключён в HTML; **не используется** в script.js (скрипт использует свой массив `imagePaths`) |
| `about.js` | Константа `ABOUT_TEXT` — текст блока «We are»; используется в script.js |
| `script.js` | Вся логика: canvas, грид изображений, фильтры, мобильное меню, анимации |

## 2. Данные и разметка, на которые опирается код

### DOM-элементы (id/классы из index.html)
- `#loadingIndicator`, `#loadingText` — экран загрузки
- `#canvas` — канвас для грида
- `#backButton` — кнопка «back»
- `#aboutText` — блок «We are»
- `#projectAboutText`, `#projectName`, `#projectInfo` — блок описания проекта
- `#filterButtons`, `.filter-button`, `#weAreButton` — фильтры
- `#indexFolderList` — список папок в index-режиме
- `#mobileHomepageNav`, `#mobileNavLines`, `.mobile-nav-label` — мобильная навигация
- `#mobileCategoryContent`, `#mobileCategoryBack`, `#mobileCategoryTitle`, `#mobileCategoryBody` — мобильный контент категории

### Данные в script.js
- **imagePaths** — массив путей к изображениям (строка ~939), все пути вида `Imgae test /<folder>/<file>`
- Загрузка **about.txt** по пути папки: `fetch(\`${encodedPath}/about.txt\`)` для проектов

## 3. Внешние ресурсы (папки/файлы на диске)

| Ресурс | Использование |
|--------|----------------|
| **Папка `Imgae test /`** | Все изображения для random grid; подпапки = проекты |
| **Файлы `about.txt`** | В подпапках проектов внутри `Imgae test /` — описание проекта при клике |
| **Папка `about/`** | Файл `about/about.txt` — дублирует текст из about.js; для index не обязателен |

## 4. Что НЕ используется для работы index.html

- **js/** (config.js, imageLoader.js, pointSystem.js, utils.js) — не подключены в HTML и не подключаются из script.js
- **tests/** — тесты для модулей из js/
- **images/** — пустые папки с .gitkeep; реальные изображения в `Imgae test /`
- **images.js** — подключён, но script.js не вызывает `getAllImages()` / `imageCategories`
- Документация: AUDIT_FIXES.md, CODE_AUDIT.md, FIXED3_SETUP.md, FULL_TEST_SUITE.md, IMPROVEMENT_REPORT.md, OPTIMIZATION_REPORT.md, PERFORMANCE_REVIEW.md, README.md, ROLLBACK_GUIDE.md, SERVER_INSTRUCTIONS.md, SETUP_GITHUB.md, TEST_*.md
- Скрипты/прочее: compress_images.sh, log_state.sh, ig-scraper.js, newyears_risset_midi.scd, location_posts_filtered_*.json, playwright-screenshot*.png

## 5. Минимальный набор для работы index (билд)

```
index.html
style.css
script.js
about.js
Imgae test /   (вся папка со всеми подпапками и файлами)
```

Опционально:
- `images.js` — можно оставить для совместимости или убрать из HTML, если не планируется использование.
- `about/about.txt` — не обязателен, текст уже в about.js.
