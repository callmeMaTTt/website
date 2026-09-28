# spotify → youtube music

A Claude-powered agent that copies a Spotify playlist into YouTube Music.

The script reads every track from the Spotify playlist and creates a new playlist
on YouTube Music. Then Claude works through the tracks in batches. For each track it
searches YouTube Music, picks the right result, and adds it. It skips live versions,
remixes, covers and sped-up uploads, and checks duration and explicit/clean. Tracks
with no good match are listed at the end instead of being guessed.

Progress is saved in `.state/`, so if a run is interrupted you can re-run the same
command and it picks up where it left off.

## setup (one time)

```bash
cd tools/spotify-to-ytmusic
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

**1. Anthropic API key.** Get one from https://platform.claude.com, then:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

**2. Spotify app credentials.** Create an app at https://developer.spotify.com/dashboard
(any name; add `http://127.0.0.1:8888/callback` as a redirect URI), then:

```bash
export SPOTIPY_CLIENT_ID=...
export SPOTIPY_CLIENT_SECRET=...
export SPOTIPY_REDIRECT_URI=http://127.0.0.1:8888/callback   # only needed for --spotify-user-auth
```

**3. YouTube Music login.** Run `ytmusicapi browser` and follow the prompts. It asks you to
copy request headers from a logged-in music.youtube.com tab in your browser's dev tools
(see https://ytmusicapi.readthedocs.io/en/stable/setup/browser.html). This writes
`browser.json`. It's gitignored because it contains your session cookies.

## run

```bash
python agent.py "https://open.spotify.com/playlist/<your-playlist-id>"
```

Options:

| flag | what it does |
|---|---|
| `--name "..."` | name for the new YouTube Music playlist (default: same as Spotify) |
| `--public` | make it public (default: private) |
| `--dry-run` | do all the matching but don't create or change anything on YouTube Music |
| `--spotify-user-auth` | log in to Spotify through the browser. Needed for private or collaborative playlists |
| `--model` / `--effort` | Claude model (default `claude-opus-5`) and effort (default `medium`) |
| `--batch-size N` | tracks handed to the agent at a time (default 10) |

## notes

- Tracks are added roughly in Spotify order, since the agent resolves them batch by batch.
- The agent can only add video IDs that a real search returned, so it can't invent songs.
- Spotify blocks third-party apps from reading its own editorial and algorithmic playlists
  (e.g. "Today's Top Hits", Discover Weekly). Copy those into one of your own playlists first.
- API cost grows with playlist length. Try `--dry-run` on a small playlist first to see how it behaves.
