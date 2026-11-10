# Chrome Web Store listing text

**Name:** AIUB Slide Downloader
**Summary (max 132):** Saves new slides and notes from the AIUB portal and your Teams classes into your AIUB folder, numbered in order. Unofficial.
**Category:** Education   **Language:** English

## Description
AIUB Slide Downloader is an unofficial tool made by a student. It is not made, endorsed or sponsored by AIUB or Microsoft.

When you open the AIUB student portal, a small panel checks your courses and saves the lecture slides and notes you do not have yet.
- You choose once where your files go (Desktop, another drive, any folder); an AIUB folder is made there. Files go into `AIUB/<course>/`, numbered in course order (01, 02, 03 ...). "Change folder" picks another place any time.
- Files you already have are never downloaded twice. A file or folder you delete is saved again on the next check.
- ZIP files are unpacked; files without an extension get the right one.
- If you are signed in to Microsoft Teams (SharePoint) for AIUB, class files from Teams are added too.
- If a teacher edits a file, the new version is saved and the old copy is kept in `AIUB/_Old versions`.

**Works only for AIUB students:** you need your own AIUB student portal account (and, for Teams files, your AIUB Microsoft 365 account). Without them the extension has nothing to download.

To read Teams files, the extension may open a SharePoint page in a background tab for a few seconds so Microsoft can sign you in, then closes it.

Everything runs on your computer. No account, no server, no tracking.

## Single purpose
Download new course files from the AIUB portal and AIUB Teams class sites into the student's AIUB folder.

## Permission justifications
- **storage** - remembers which files were saved and where (so they are not downloaded twice), your first name for the greeting, and the Teams class sites you opened.
- **scripting** - shows the panel again when the student clicks the extension icon on the portal.
- **https://portal.aiub.edu/*** - reads the student's own course pages and downloads the files linked there.
- **https://aiubedu60714.sharepoint.com/*** - reads the student's own Teams class files (read only).
- Folder access: the extension uses Chrome's File System Access API. The student picks the AIUB folder in Chrome's own folder window and Chrome asks for permission; the extension only reads and writes inside that folder.
- Remote code: none. All code is inside the package.

## Notes for the reviewer
1. The extension only works with an AIUB student account. A short screen recording of the full flow is linked in the "Test instructions" field (and a test account, if one can be provided).
2. Open the portal home page; a panel appears. Click the extension icon to re-check.
3. The panel asks for a folder: choose any empty folder (an AIUB folder is made inside it) and allow editing. New files are saved into AIUB/<COURSE>/NN - NAME (PORTAL).EXT.
4. Teams files appear only if the account is also signed in to Microsoft 365; the extension opens a background SharePoint tab once to use single sign-on, then closes it.

## Screenshots to prepare (1280x800)
Panel on the portal, finished download list, the AIUB folder in the file manager.
