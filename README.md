# ReMusic-style Digitizer

This repository now includes a full-stack implementation inspired by the original
[SanQuilmas/ReMusic](https://github.com/SanQuilmas/ReMusic) project. You can upload
scanned sheet music, run optical music recognition (OMR) with the OEmer CLI, convert the
generated MusicXML to MIDI via Music21, preview the score in the browser, and download
the resulting files.

## Project layout

```
.
├─ src/                 # React (Vite) SPA
├─ server/              # Express API + background jobs
│  ├─ scripts/          # Python helpers (MusicXML -> MIDI)
│  └─ data/             # SQLite database (created at runtime)
└─ storage/             # Uploaded images, generated MusicXML & MIDI (created at runtime)
```

## Prerequisites

- Node.js 20+
- Python 3.10+ with `pip`
- [OEmer](https://pypi.org/project/oemer/) CLI on the system `PATH`
- Python packages: `music21`, `oemer` (install with `pip install music21 oemer`)
- Optional but recommended: `virtualenv` to isolate Python dependencies

## Setup

1. Install JavaScript dependencies for both the client and server:

	```powershell
	npm install
	npm --prefix server install
	```

2. Copy the server environment template and adjust if needed:

	```powershell
	Copy-Item server/.env.example server/.env
	```

	Override `OEMER_BIN`, `PYTHON_BIN`, or storage paths there if the defaults do not
	match your environment.

3. Ensure Python dependencies are available:

	```powershell
	pip install music21 oemer
	```

4. Run the initial database migration (tables are created on demand but this verifies the
	connection):

	```powershell
	npm run migrate:server
	```

## Running locally

The client (Vite) and the API (Express) run separately. Use two terminals:

```powershell
npm run dev           # starts Vite on http://localhost:5173
npm run dev:server    # starts Express on http://localhost:4000
```

Set `VITE_API_URL` in a `.env` file at the project root if you expose the API on a
different host or port. The client falls back to `http://localhost:4000` otherwise.

## Features

- Upload sheet music images (PNG, JPG, etc.)
- Background job queue invokes OEmer to produce MusicXML
- MusicXML-to-MIDI conversion through Music21
- Real-time status updates with progress tracking and activity log
- OpenSheetMusicDisplay rendering of the generated score inside the SPA
- Integrated HTML MIDI player with piano-roll visualizer
- Download links for MusicXML and MIDI assets
- Library management with the ability to delete processed scores

## Troubleshooting

- **OEmer or Python command not found:** set `OEMER_BIN` or `PYTHON_BIN` in
  `server/.env` to point at the correct executables.
- **MusicXML missing after OCR:** OEmer can fail on noisy scans. Check the server logs
  and try rescanning at a higher resolution.
- **MIDI player blank:** ensure the custom elements from
  `html-midi-player` load correctly; the SPA injects the script on demand.

## License

This project re-implements the published features of ReMusic without copying its source
code. OEmer, Music21, and other dependencies retain their respective licenses.
