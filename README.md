# annotation

Minimal GitHub Pages prototype for CDCF annotation.

The page uses Google Identity Services in the browser and writes annotation rows to a shared Google Spreadsheet through the Google Sheets API.

## Local preview

```bash
python3 -m http.server 8000 --directory docs
```

Then open:

```text
http://localhost:8000/
```

## GitHub Pages

Set the Pages source to:

```text
Branch: main
Folder: /docs
```

## Google OAuth origins

For local testing, add this Authorized JavaScript origin to the Google OAuth client:

```text
http://localhost:8000
```

For GitHub Pages, add:

```text
https://chengzhang6.github.io
```
