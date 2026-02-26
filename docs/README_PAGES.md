# Deploying SuperSpace static site to GitHub Pages

1. Make the repository public on GitHub (Settings → General → 'Make public').
2. Run the helper to prepare the `docs/` folder (PowerShell):

```powershell
cd "d:\Code_Playground\Games\SuperSpace"
./tools/deploy_to_pages.ps1
```

3. Edit `docs/config.json` and set `API_URL` to your Railway app URL.
4. Commit and push the `docs/` folder to the `main` branch.
5. In GitHub, enable Pages: Settings → Pages → Branch: `main` / folder: `/docs`.
6. Wait a few minutes and open `https://<your-github-username>.github.io/<repo-name>/`.

Notes
- If you prefer automatic deploys, use a GitHub Action that builds and pushes to `gh-pages`.
- Keep secrets only on the server (Railway). Do not put keys in `docs/config.json`.
