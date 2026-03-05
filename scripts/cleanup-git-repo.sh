#!/usr/bin/env bash
#
# Скрипт для удаления неактуальных версий и файлов проекта на гите.
# Запуск: из корня репозитория: bash scripts/cleanup-git-repo.sh
# Режимы: --dry-run (только показать, что будет сделано), без флага — выполнить.
#
set -e
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "=== Режим --dry-run: команды только выводятся, не выполняются ==="
fi

run() {
  if $DRY_RUN; then
    echo "[DRY-RUN] $*"
  else
    "$@"
  fi
}

echo "--- 1) Удалить из индекса git файлы, которые уже удалены с диска ---"
run git add -u
echo "   (git add -u добавляет изменения и удаляет из индекса файлы, удалённые локально)"

echo ""
echo "--- 2) Удалить удалённые ветки на remote (prune) ---"
run git fetch --prune
echo "   (после этого 'git branch -r' не покажет веток, которых уже нет на remote)"

echo ""
echo "--- 3) Список локальных веток, уже смерженных в текущую (их можно удалить) ---"
MERGED=$(git branch --merged | grep -v '^\*' || true)
if [[ -z "$MERGED" ]]; then
  echo "   Нет смерженных веток для удаления."
else
  echo "$MERGED"
  if ! $DRY_RUN && [[ -n "$MERGED" ]]; then
    echo "Удалить эти локальные ветки? (y/n)"
    read -r ans
    if [[ "$ans" == "y" || "$ans" == "Y" ]]; then
      echo "$MERGED" | xargs git branch -d 2>/dev/null || true
    fi
  fi
fi

echo ""
echo "--- 4) Очистить reflog и собрать мусор (опционально, уменьшает размер .git) ---"
if $DRY_RUN; then
  echo "[DRY-RUN] git reflog expire --expire=now --all && git gc --prune=now --aggressive"
else
  echo "Выполнить агрессивную очистку reflog и gc? (y/n)"
  read -r ans
  if [[ "$ans" == "y" || "$ans" == "Y" ]]; then
    git reflog expire --expire=now --all
    git gc --prune=now --aggressive
    echo "   Готово."
  fi
fi

echo ""
echo "--- Готово. Дальше закоммитьте и запушьте изменения (в т.ч. удалённые файлы): ---"
echo "   git status"
echo "   git commit -m 'Remove deleted files and cleanup'"
echo "   git push origin <ваша-ветка>"
