# AIUB Slide Downloader

A Chrome extension for AIUB students. When you open the portal dashboard, it saves the new or missing course files from the portal and your Microsoft Teams classes into your `AIUB` folder, numbered in course order.

**Semester:** Fall 2026-2027

## Clone the Project

```bash
git clone https://github.com/munshi-rishad/AIUB-Smart-Slide-Downloader.git
```

## Run It (Load unpacked)

1. Open the project in VS Code (File → Open Folder).
2. In Chrome, go to `chrome://extensions`, turn on **Developer mode** and click **Load unpacked**.
3. Select the `extension` folder.
4. Open your AIUB dashboard (`portal.aiub.edu/Student`).
5. The first time, the panel asks where to save your files. Click **Choose folder**, open your Desktop (or D: drive), click **New folder**, name it `AIUB`, select it and allow access. Chrome does not let you pick the Desktop, Documents, Downloads or a whole drive itself ("contains system files"), only a folder inside them. If Chrome asks again after a restart, click **Allow** and choose **Allow on every visit**.
6. To save somewhere else later, click **Change folder** in the panel. If you moved your `AIUB` folder there first, nothing is downloaded again.

It works like the old version:
- a file or folder you delete comes back on the next refresh
- files stay numbered in course order; a file uploaded later gets its place and the others are renumbered
- a file the teacher edits is downloaded again, and the old copy goes to `AIUB/_Old versions`
- the same file on the portal and on Teams is saved only once

## Tests

```bash
node tests/lib.test.js
node tests/background.test.js
node tests/teams.test.js
node tests/zip.test.js
node tests/store.test.js
node tests/e2e.chrome.js
```

`e2e.chrome.js` runs the extension in real Google Chrome against a fake portal (needs the `playwright` package).

## Publish to the Chrome Web Store

`node scripts/pack.js` makes `dist/AIUB-Slide-Downloader-v<version>-store.zip`. Upload that file.
