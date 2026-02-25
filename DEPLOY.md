# Деплой 4lights на GitHub Pages

## Что уже настроено

- **Локально**: `npm run dev` и `npm run build` + `npm run preview` работают (base `/`, картинки из `/img/`, `#` в путях обрабатываются).
- **Веб**: при открытии с `https://<user>.github.io/4lights/` приложение само подставляет base `/4lights/` для скриптов и картинок.
- **Сборка**: при `npm run build` в `dist` попадают index, assets и копия папки картинок `dist/img` (имена с `#` заменены на `%23`).
- **Workflow**: при пуше в `main` запускается сборка и деплой в GitHub Pages (`.github/workflows/deploy-pages.yml`).

## Как отправить билд и контент на GitHub

1. **Репозиторий на GitHub**  
   Создай репозиторий (например `4lights`), если его ещё нет.

2. **Включи GitHub Pages**  
   В репозитории: **Settings → Pages**:
   - Source: **GitHub Actions**.

3. **Пуш кода с этого компьютера**

   ```bash
   cd "/Users/ilyaduganov/Desktop/4lights refactored"

   # Если репозиторий ещё не привязан:
   git remote add origin https://github.com/<USER>/4lights.git

   git add .
   git commit -m "4lights: working build + GitHub Pages deploy"
   git push -u origin main
   ```

   После пуша в `main` workflow сам соберёт проект и задеплоит его. Сайт будет по адресу:  
   `https://<USER>.github.io/4lights/`

4. **Что должно быть в репозитории для веба**

   - Исходники: `src/`, `public/` (в т.ч. `script.js`, `about.js`), `index.html`, `vite.config.js`, `package.json`, и т.д.
   - Картинки для веба — **только** в `public/Imgae test /` (только оптимизированные под веб форматы, см. ниже).
   - В репозиторий **не** коммитится папка `dist/` — её создаёт workflow при деплое.
   - Папка в корне `Imgae test ` в репозиторий **не** попадает (оригиналы только локально).

---

## Заменить на GitHub старые картинки на оптимизированные под веб

Чтобы в репозитории были **только** картинки, оптимизированные под веб (без HEIC/RAW/видео и т.п.):

1. **Подготовить веб-набор и оптимизировать** (одна команда):

   ```bash
   npm run web-images
   ```

   Это по очереди:
   - копирует из корневой `Imgae test ` в `public/Imgae test ` только веб-форматы (jpg, jpeg, png, gif, webp, svg) и `about.txt`;
   - сжимает их (compress-images);
   - обновляет список картинок в `public/script.js` (generate-image-list).

2. **Закоммитить и отправить на GitHub только этот контент**:

   ```bash
   git add "public/Imgae test /" public/script.js
   git status   # убедись, что только нужные файлы
   git commit -m "Replace images with web-optimized set"
   git push origin main
   ```

   В репозитории останутся только картинки из `public/Imgae test /` (оптимизированные). Старые файлы, которые больше не входят в этот набор, в репо не попадут.

Если репозиторий будет называться не `4lights`, в `src/App.jsx` в функции `getBasePath()` нужно заменить `4lights` на имя репо.
