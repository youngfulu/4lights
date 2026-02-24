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
   - Папка с картинками: либо в корне (`Imgae test `), либо в `public/Imgae test `) — билд подхватит ту, что найдёт.
   - В репозиторий **не** коммитится папка `dist/` — её создаёт workflow при деплое.

Если репозиторий будет называться не `4lights`, в `src/App.jsx` в функции `getBasePath()` нужно заменить `4lights` на имя репо.
