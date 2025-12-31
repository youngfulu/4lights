# Setup 4lights on GitHub

## Step 1: Create New Repository on GitHub

1. Go to https://github.com/new
2. Repository name: `4lights`
3. Description: "Image gallery with parallax effects"
4. Choose Public or Private
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

## Step 2: Connect and Push

After creating the repository, run these commands:

```bash
cd "/Users/ilyaduganov/Desktop/web folio/4lights"
git remote add origin https://github.com/youngfulu/4lights.git
git push -u origin main
```

## Step 3: Enable GitHub Pages

1. Go to: https://github.com/youngfulu/4lights/settings/pages
2. Under "Source", select "Deploy from a branch"
3. Choose branch: `main`
4. Choose folder: `/ (root)`
5. Click "Save"
6. Wait a few minutes for deployment

Your site will be available at: **https://youngfulu.github.io/4lights/**




