#!/usr/bin/env python3
"""Spotify -> YouTube Music playlist importer, driven by a Claude agent.

The script reads every track from a Spotify playlist, creates a matching
playlist on YouTube Music, and hands the matching work to Claude: for each
track it searches YouTube Music, picks the right result (studio version vs.
live/remix/cover, clean vs. explicit, etc.), and adds it.

All state lives in Python, not in the model's context: the agent pulls tracks
in small batches, can only add video IDs that a search actually returned, and
progress is saved to a JSON file so an interrupted run resumes where it left
off.

Usage:
    python agent.py https://open.spotify.com/playlist/<id>
    python agent.py <playlist-url> --name "My copy" --public
    python agent.py <playlist-url> --dry-run   # match only, don't write to YT Music
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import anthropic
import spotipy
from anthropic import beta_tool
from pydantic import BaseModel, Field
from spotipy.oauth2 import SpotifyClientCredentials, SpotifyOAuth
from ytmusicapi import YTMusic

HERE = Path(__file__).resolve().parent
STATE_DIR = HERE / ".state"
ADD_BATCH_SIZE = 25  # YouTube Music accepts batches; keep them modest

SYSTEM_PROMPT = """\
You are migrating a Spotify playlist to YouTube Music. Your job is to find the \
correct YouTube Music song for every Spotify track and record the result.

Loop until get_next_tracks reports nothing left:
1. Call get_next_tracks to receive the next batch of unresolved tracks.
2. For each track, call search_youtube_music (you may issue several searches in \
parallel). A good first query is "<title> <primary artist>".
3. For each track, either call add_matches with the chosen video_id, or \
mark_unmatched with a short reason. Resolve every track in the batch before \
asking for the next one.

Choosing a match:
- Prefer results of type "song" (official audio) over "video" (music videos, \
uploads) when both are the same recording.
- Title and artist must genuinely match. Ignore suffixes like "- Remastered 2011" \
or "(feat. X)" differences, but do NOT substitute a live version, remix, cover, \
karaoke, sped-up, or instrumental unless the Spotify title says it is one.
- Duration within ~10 seconds is strong confirmation; a large mismatch usually \
means a different version.
- Match explicit/clean to the Spotify track when both versions exist.
- If the first search is poor, retry once or twice with a different query \
(e.g. drop "feat." artists, use the album name, or search with kind="videos"). \
If nothing is right, mark the track unmatched rather than guessing.

When everything is resolved, reply with a one-paragraph summary.\
"""


# ---------------------------------------------------------------------------
# Spotify
# ---------------------------------------------------------------------------


def spotify_client(user_auth: bool) -> spotipy.Spotify:
    if user_auth:
        # Needed for private/collaborative playlists. Requires a redirect URI
        # registered on your Spotify app (SPOTIPY_REDIRECT_URI).
        auth = SpotifyOAuth(
            scope="playlist-read-private playlist-read-collaborative",
            cache_path=str(STATE_DIR / "spotify-token.json"),
        )
    else:
        auth = SpotifyClientCredentials()
    return spotipy.Spotify(auth_manager=auth)


def fetch_spotify_playlist(sp: spotipy.Spotify, playlist: str) -> tuple[str, str, list[dict]]:
    meta = sp.playlist(playlist, fields="id,name,description")
    tracks: list[dict] = []
    page = sp.playlist_items(meta["id"], additional_types=("track",))
    while page:
        for entry in page["items"]:
            track = entry.get("track") or entry.get("item")
            if not track or track.get("type", "track") != "track":
                continue  # removed tracks, podcast episodes
            tracks.append(
                {
                    "index": len(tracks),
                    "title": track["name"],
                    "artists": [a["name"] for a in track.get("artists", []) if a.get("name")],
                    "album": (track.get("album") or {}).get("name"),
                    "duration_seconds": round((track.get("duration_ms") or 0) / 1000),
                    "explicit": bool(track.get("explicit")),
                }
            )
        page = sp.next(page) if page.get("next") else None
    return meta["id"], meta["name"], tracks


# ---------------------------------------------------------------------------
# Migration state (persisted so runs can resume)
# ---------------------------------------------------------------------------


class Migration:
    def __init__(self, path: Path, tracks: list[dict], yt: YTMusic, dry_run: bool):
        self.path = path
        self.tracks = tracks
        self.yt = yt
        self.dry_run = dry_run
        self.state = {"yt_playlist_id": None, "matched": {}, "unmatched": {}, "added": [], "pending_adds": []}
        if path.exists():
            self.state.update(json.loads(path.read_text()))
        # Matched but not yet sent to YouTube Music; persisted so a crash can't drop them.
        self.pending_adds: list[str] = self.state["pending_adds"]
        self.searched_ids: dict[str, dict] = {}  # video_id -> search result, to validate picks

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(self.state, indent=2))

    def resolved(self, index: int) -> bool:
        key = str(index)
        return key in self.state["matched"] or key in self.state["unmatched"]

    def ensure_playlist(self, name: str, description: str, privacy: str) -> None:
        if self.dry_run or self.state["yt_playlist_id"]:
            return
        playlist_id = self.yt.create_playlist(name, description, privacy_status=privacy)
        if not isinstance(playlist_id, str):
            raise RuntimeError(f"Could not create YouTube Music playlist: {playlist_id}")
        self.state["yt_playlist_id"] = playlist_id
        self.save()
        print(f"Created YouTube Music playlist: https://music.youtube.com/playlist?list={playlist_id}")

    def flush(self) -> None:
        if not self.pending_adds:
            return
        if not self.dry_run:
            result = self.yt.add_playlist_items(
                self.state["yt_playlist_id"], self.pending_adds, duplicates=True
            )
            if isinstance(result, dict) and result.get("status") not in (None, "STATUS_SUCCEEDED"):
                raise RuntimeError(f"YouTube Music rejected the add: {result}")
        self.state["added"].extend(self.pending_adds)
        self.pending_adds.clear()
        self.save()


# ---------------------------------------------------------------------------
# Agent tools
# ---------------------------------------------------------------------------


class Match(BaseModel):
    track_index: int = Field(description="The Spotify track's index from get_next_tracks.")
    video_id: str = Field(description="The videoId of the chosen YouTube Music search result.")


def build_tools(m: Migration, batch_size: int):
    @beta_tool
    def get_next_tracks() -> str:
        """Return the next batch of Spotify tracks that still need a YouTube Music match.

        Returns JSON with `remaining` (unresolved tracks left in total) and `tracks`.
        An empty `tracks` list means the migration is complete.
        """
        pending = [t for t in m.tracks if not m.resolved(t["index"])]
        return json.dumps({"remaining": len(pending), "tracks": pending[:batch_size]})

    @beta_tool
    def search_youtube_music(query: str, kind: str = "songs") -> str:
        """Search YouTube Music and return the top candidates.

        Args:
            query: Free-text search, e.g. "Dreams Fleetwood Mac".
            kind: "songs" for official audio (default) or "videos" for music videos and uploads.
        """
        if kind not in ("songs", "videos"):
            return "Error: kind must be 'songs' or 'videos'."
        results = m.yt.search(query, filter=kind, limit=8)
        candidates = []
        for r in results:
            if not r.get("videoId"):
                continue
            c = {
                "video_id": r["videoId"],
                "type": r.get("resultType"),
                "title": r.get("title"),
                "artists": [a["name"] for a in r.get("artists") or [] if a.get("name")],
                "album": (r.get("album") or {}).get("name"),
                "duration_seconds": r.get("duration_seconds"),
                "explicit": r.get("isExplicit"),
            }
            m.searched_ids[c["video_id"]] = c
            candidates.append(c)
            if len(candidates) == 5:
                break
        return json.dumps(candidates) if candidates else "No results."

    @beta_tool
    def add_matches(matches: list[Match]) -> str:
        """Record chosen matches and add them to the YouTube Music playlist.

        Args:
            matches: One entry per resolved track. video_id must come from a search_youtube_music result.
        """
        errors, added = [], 0
        for match in matches:
            if not 0 <= match.track_index < len(m.tracks):
                errors.append(f"track_index {match.track_index} does not exist")
                continue
            if m.resolved(match.track_index):
                errors.append(f"track {match.track_index} is already resolved")
                continue
            if match.video_id not in m.searched_ids:
                errors.append(f"video_id {match.video_id} was not returned by any search")
                continue
            m.state["matched"][str(match.track_index)] = m.searched_ids[match.video_id]
            m.pending_adds.append(match.video_id)
            added += 1
            track = m.tracks[match.track_index]
            print(f"  + {track['title']} — {', '.join(track['artists'])}")
        if len(m.pending_adds) >= ADD_BATCH_SIZE:
            m.flush()
        m.save()
        return f"Added {added}." + (f" Errors: {'; '.join(errors)}" if errors else "")

    @beta_tool
    def mark_unmatched(track_index: int, reason: str) -> str:
        """Record that no correct YouTube Music match exists for a track.

        Args:
            track_index: The Spotify track's index from get_next_tracks.
            reason: Short explanation, e.g. "only live versions found".
        """
        if not 0 <= track_index < len(m.tracks):
            return f"Error: track_index {track_index} does not exist."
        if m.resolved(track_index):
            return f"Error: track {track_index} is already resolved."
        m.state["unmatched"][str(track_index)] = reason
        m.save()
        track = m.tracks[track_index]
        print(f"  ✗ {track['title']} — {', '.join(track['artists'])} ({reason})")
        return "Recorded."

    return [get_next_tracks, search_youtube_music, add_matches, mark_unmatched]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("playlist", help="Spotify playlist URL, URI, or ID")
    parser.add_argument("--name", help="Name for the YouTube Music playlist (default: same as Spotify)")
    parser.add_argument("--public", action="store_true", help="Make the YouTube Music playlist public")
    parser.add_argument("--dry-run", action="store_true", help="Match tracks but don't write to YouTube Music")
    parser.add_argument("--spotify-user-auth", action="store_true", help="Log in to Spotify (needed for private playlists)")
    parser.add_argument("--ytmusic-auth", default=str(HERE / "browser.json"), help="ytmusicapi auth file (default: browser.json)")
    parser.add_argument("--model", default="claude-opus-5", help="Claude model ID")
    parser.add_argument("--effort", default="medium", choices=["low", "medium", "high", "xhigh", "max"])
    parser.add_argument("--batch-size", type=int, default=10, help="Tracks handed to the agent per batch")
    args = parser.parse_args()

    if not Path(args.ytmusic_auth).exists():
        print(f"Missing {args.ytmusic_auth}. Run `ytmusicapi browser` first (see README).", file=sys.stderr)
        return 1

    sp = spotify_client(args.spotify_user_auth)
    playlist_id, playlist_name, tracks = fetch_spotify_playlist(sp, args.playlist)
    print(f"Spotify playlist '{playlist_name}': {len(tracks)} tracks")
    if not tracks:
        return 0

    suffix = "-dryrun" if args.dry_run else ""
    migration = Migration(STATE_DIR / f"{playlist_id}{suffix}.json", tracks, YTMusic(args.ytmusic_auth), args.dry_run)
    migration.ensure_playlist(
        args.name or playlist_name,
        f"Imported from Spotify: https://open.spotify.com/playlist/{playlist_id}",
        "PUBLIC" if args.public else "PRIVATE",
    )

    remaining = sum(not migration.resolved(t["index"]) for t in tracks)
    if remaining < len(tracks):
        print(f"Resuming: {len(tracks) - remaining} already done, {remaining} to go")

    client = anthropic.Anthropic()
    runner = client.beta.messages.tool_runner(
        model=args.model,
        max_tokens=16000,
        max_iterations=20 + remaining * 4,
        system=SYSTEM_PROMPT,
        thinking={"type": "adaptive"},
        output_config={"effort": args.effort},
        tools=build_tools(migration, args.batch_size),
        # Old search results are dead weight once a batch is resolved; clearing
        # them keeps long playlists from filling the context window.
        context_management={"edits": [{"type": "clear_tool_uses_20250919"}]},
        # On a safety refusal, re-run the turn on a fallback model instead of stopping.
        fallbacks="default",
        betas=["context-management-2025-06-27", "server-side-fallback-2026-07-01"],
        messages=[
            {
                "role": "user",
                "content": f"Migrate the Spotify playlist '{playlist_name}' ({remaining} unresolved tracks) to YouTube Music.",
            }
        ],
    )

    final = None
    try:
        for message in runner:
            final = message
    finally:
        migration.flush()  # never lose matches that were chosen but not yet sent

    if final is not None and final.stop_reason == "refusal":
        print("The model declined to continue; progress so far is saved.", file=sys.stderr)
    elif final is not None:
        summary = "".join(b.text for b in final.content if b.type == "text").strip()
        if summary:
            print("\n" + summary)

    matched, unmatched = migration.state["matched"], migration.state["unmatched"]
    left = len(tracks) - len(matched) - len(unmatched)
    print(f"\nDone: {len(matched)} added, {len(unmatched)} unmatched, {left} unresolved.")
    if unmatched:
        print("Unmatched tracks:")
        for idx, reason in sorted(unmatched.items(), key=lambda kv: int(kv[0])):
            t = tracks[int(idx)]
            print(f"  - {t['title']} — {', '.join(t['artists'])}: {reason}")
    if left:
        print("Re-run the same command to pick up the remaining tracks.")
    if migration.state["yt_playlist_id"]:
        print(f"Playlist: https://music.youtube.com/playlist?list={migration.state['yt_playlist_id']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
