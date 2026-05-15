# Deploy till GitHub Pages

Kör detta för att publicera ändringarna live:

```bash
git add index.html config.js sw.js manifest.json icon.svg
git commit -m "$ARGUMENTS"
git push origin main
```

Appen är live på GitHub Pages ca 1-2 minuter efter push.

**Exempel:**
```
/deploy Lägger till påminnelsebanner på hemskärmen
```
