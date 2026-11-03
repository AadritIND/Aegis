#!/usr/bin/env python3
"""Assemble a macOS Aegis.app from the official Electron darwin binaries.

This runs on Windows/Linux/macOS alike and never extracts anything to disk:
it rewrites the Electron release zip entry-by-entry, so symlinks, unix modes
and the Mach-O signatures already inside Electron's binaries survive intact.
Renaming the app means renaming the helper bundles too — Chromium looks them
up by the main bundle's executable name.

The result is unsigned and un-notarised: macOS will ask for a right-click
"Open" the first time, and Apple silicon users may need to clear the
quarantine flag (see the printed instructions / README).

Usage:
    python scripts/build-mac.py                # arm64 + x64
    python scripts/build-mac.py --arch arm64
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import plistlib
import shutil
import subprocess
import sys
import urllib.request
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STAGING = os.path.join(ROOT, ".tmp-mac")
CACHE = os.path.join(STAGING, "cache")
ESCAPE = r"\033"


def log(message: str) -> None:
    print(f"[build-mac] {message}", flush=True)


def electron_version() -> str:
    with open(os.path.join(ROOT, "node_modules", "electron", "package.json"), encoding="utf-8") as handle:
        return json.load(handle)["version"]


def app_version() -> str:
    with open(os.path.join(ROOT, "package.json"), encoding="utf-8") as handle:
        return json.load(handle)["version"]


def download(url: str, target: str) -> None:
    if os.path.exists(target) and os.path.getsize(target) > 50 * 1024 * 1024:
        log(f"cached {os.path.basename(target)}")
        return
    log(f"downloading {os.path.basename(target)}")
    os.makedirs(os.path.dirname(target), exist_ok=True)
    partial = target + ".part"
    with urllib.request.urlopen(url) as response, open(partial, "wb") as handle:
        total = int(response.headers.get("content-length") or 0)
        seen = 0
        step = 20 * 1024 * 1024
        next_mark = step
        while True:
            chunk = response.read(1024 * 512)
            if not chunk:
                break
            handle.write(chunk)
            seen += len(chunk)
            if seen >= next_mark:
                percent = f"{seen * 100 / total:.0f}%" if total else f"{seen // (1024 * 1024)} MB"
                log(f"  .. {percent}")
                next_mark += step
    os.replace(partial, target)


def prepare_asar(version: str) -> str:
    """Return the app.asar to embed.

    A packaged app.asar is platform-independent, so when the Windows bundle has
    already been built we reuse it verbatim: every platform then ships exactly
    the same bytes, production dependencies included.
    """
    packaged = os.path.join(ROOT, "release", "win-unpacked", "resources", "app.asar")
    assembled = os.path.join(STAGING, "app.asar")
    dist_dir = os.path.join(ROOT, "dist")

    if os.path.exists(packaged):
        if os.path.exists(dist_dir) and os.path.getmtime(dist_dir) > os.path.getmtime(packaged) + 1:
            log("WARNING: dist/ is newer than the packaged app.asar — run `npm run dist` so the payload is current")
        shutil.copyfile(packaged, assembled)
        log(f"reusing the packaged app.asar ({os.path.getsize(assembled) // 1024} KB) — identical code on every platform")
        return assembled

    log("no packaged app.asar found — assembling one from dist/ + electron/")
    return build_asar(version)


def build_asar(version: str) -> str:
    """Pack dist/ + electron/ + a trimmed package.json the way the Windows build does."""
    app_dir = os.path.join(STAGING, "app")
    shutil.rmtree(app_dir, ignore_errors=True)
    os.makedirs(app_dir, exist_ok=True)

    for entry in ("dist", "electron"):
        shutil.copytree(os.path.join(ROOT, entry), os.path.join(app_dir, entry))

    with open(os.path.join(ROOT, "package.json"), encoding="utf-8") as handle:
        manifest = json.load(handle)
    trimmed = {
        "name": manifest["name"],
        "productName": manifest.get("productName", "Aegis"),
        "version": version,
        "description": manifest.get("description", ""),
        "main": manifest["main"],
    }
    with open(os.path.join(app_dir, "package.json"), "w", encoding="utf-8") as handle:
        json.dump(trimmed, handle, indent=2)

    asar_bin = os.path.join(ROOT, "node_modules", "@electron", "asar", "bin", "asar.js")
    out = os.path.join(STAGING, "app.asar")
    subprocess.run(["node", asar_bin, "pack", app_dir, out], check=True, cwd=ROOT)
    log(f"packed app.asar ({os.path.getsize(out) // 1024} KB)")
    return out


HELPER_SUFFIXES = ["", " (GPU)", " (Plugin)", " (Renderer)"]
DROP = {"Contents/Resources/default_app.asar", "Contents/Resources/electron.icns"}

PLIST_KEYS_BY_BUNDLE = {
    "": "app.aegis.vault",
    " (GPU)": "app.aegis.vault.helper.GPU",
    " (Plugin)": "app.aegis.vault.helper.Plugin",
    " (Renderer)": "app.aegis.vault.helper.Renderer",
}


def helper_bundle_id(suffix: str) -> str:
    return "app.aegis.vault.helper" if suffix == "" else PLIST_KEYS_BY_BUNDLE[suffix]


def map_entry(name: str, version: str) -> str | None:
    if not name.startswith("Electron.app/"):
        return name
    rest = name[len("Electron.app/") :]
    if rest in DROP:
        return None

    for suffix in HELPER_SUFFIXES[1:]:
        rest = rest.replace(f"Electron Helper{suffix}.app", f"Aegis Helper{suffix}.app")
    rest = rest.replace("Electron Helper.app", "Aegis Helper.app")

    # executables inside those bundles (must happen before the main binary swap)
    rest = rest.replace("MacOS/Electron Helper", "MacOS/Aegis Helper")
    rest = rest.replace("MacOS/Electron", "MacOS/Aegis")

    return "Aegis.app/" + rest


def patch_plist(data: bytes, suffix: str | None, version: str) -> bytes:
    plist = plistlib.loads(data)

    if suffix is None:  # the main bundle
        plist["CFBundleExecutable"] = "Aegis"
        plist["CFBundleName"] = "Aegis"
        plist["CFBundleDisplayName"] = "Aegis"
        plist["CFBundleIdentifier"] = "app.aegis.vault"
        plist["CFBundleIconFile"] = "Aegis.icns"
        plist["LSApplicationCategoryType"] = "public.app-category.productivity"
        plist["NSHumanReadableCopyright"] = "Aegis — local-first vault"
    else:
        executable = f"Aegis Helper{suffix}"
        plist["CFBundleExecutable"] = executable
        plist["CFBundleName"] = executable
        plist["CFBundleDisplayName"] = executable
        plist["CFBundleIdentifier"] = helper_bundle_id(suffix)

    plist["CFBundleShortVersionString"] = version
    plist["CFBundleVersion"] = version
    return plistlib.dumps(plist, fmt=plistlib.FMT_XML)


def suffix_for(path: str) -> str | None:
    """Return '' for the main bundle, the helper suffix, or None if it is not a bundle plist."""
    if path == "Aegis.app/Contents/Info.plist":
        return ""
    for suffix in HELPER_SUFFIXES[1:]:
        if path == f"Aegis.app/Contents/Frameworks/Aegis Helper{suffix}.app/Contents/Info.plist":
            return suffix
    if path == "Aegis.app/Contents/Frameworks/Aegis Helper.app/Contents/Info.plist":
        return ""
    return None


def repack(source_zip: str, target_zip: str, asar_path: str, icns_path: str, version: str) -> dict:
    asar_size = os.path.getsize(asar_path)
    icns_size = os.path.getsize(icns_path)
    source_entries = 0
    written = 0

    with zipfile.ZipFile(source_zip) as zin, zipfile.ZipFile(
        target_zip, "w", zipfile.ZIP_DEFLATED, compresslevel=6
    ) as zout:
        for item in zin.infolist():
            source_entries += 1
            new_name = map_entry(item.filename, version)
            if new_name is None:
                continue
            if suffix_for(new_name) is not None and item.filename.endswith("Info.plist"):
                with zin.open(item) as stream:
                    data = stream.read()
                bare = suffix_for(new_name)
                data = patch_plist(data, None if bare == "" else bare, version)
            else:
                with zin.open(item) as stream:
                    data = stream.read()

            info = zipfile.ZipInfo(new_name, date_time=item.date_time)
            info.external_attr = item.external_attr  # keeps symlinks + unix modes
            info.create_system = item.create_system
            info.internal_attr = item.internal_attr
            info.compress_type = zipfile.ZIP_DEFLATED
            zout.writestr(info, data)
            written += 1

        for name, path, size in (
            ("Aegis.app/Contents/Resources/app.asar", asar_path, asar_size),
            ("Aegis.app/Contents/Resources/Aegis.icns", icns_path, icns_size),
        ):
            with open(path, "rb") as handle:
                info = zipfile.ZipInfo(name, date_time=(2026, 10, 28, 0, 0, 0))
                info.external_attr = 0o100644 << 16
                info.create_system = 3
                info.compress_type = zipfile.ZIP_DEFLATED
                zout.writestr(info, handle.read())
            written += 1

    return {"sourceEntries": source_entries, "writtenEntries": written, "asarSize": asar_size}


def verify(target_zip: str, version: str) -> dict:
    """Re-open the bundle and assert the things macOS will rely on."""
    problems: list[str] = []
    symlinks = 0
    executables = 0

    with zipfile.ZipFile(target_zip) as zf:
        names = set(zf.namelist())
        for name in names:
            if name.startswith("Electron.app/"):
                problems.append(f"leftover Electron.app entry: {name}")
        required = [
            "Aegis.app/Contents/Info.plist",
            "Aegis.app/Contents/MacOS/Aegis",
            "Aegis.app/Contents/Resources/app.asar",
            "Aegis.app/Contents/Resources/Aegis.icns",
            "Aegis.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework",
        ]
        for suffix in HELPER_SUFFIXES:
            required.append(f"Aegis.app/Contents/Frameworks/Aegis Helper{suffix}.app/Contents/MacOS/Aegis Helper{suffix}")
        for name in required:
            if name not in names:
                problems.append(f"missing entry: {name}")

        for info in zf.infolist():
            mode = info.external_attr >> 16
            if mode & 0o170000 == 0o120000:
                symlinks += 1
            elif mode & 0o111:
                executables += 1

        if symlinks == 0:
            problems.append("no symlink entries preserved — the framework would be broken")

        with zf.open("Aegis.app/Contents/Info.plist") as stream:
            plist = plistlib.loads(stream.read())
        if plist.get("CFBundleExecutable") != "Aegis":
            problems.append(f"CFBundleExecutable is {plist.get('CFBundleExecutable')!r}")
        if plist.get("CFBundleIdentifier") != "app.aegis.vault":
            problems.append(f"CFBundleIdentifier is {plist.get('CFBundleIdentifier')!r}")
        if plist.get("CFBundleShortVersionString") != version:
            problems.append("CFBundleShortVersionString mismatch")

        helper_plist = "Aegis.app/Contents/Frameworks/Aegis Helper (Renderer).app/Contents/Info.plist"
        with zf.open(helper_plist) as stream:
            helper = plistlib.loads(stream.read())
        if helper.get("CFBundleExecutable") != "Aegis Helper (Renderer)":
            problems.append(f"renderer helper executable is {helper.get('CFBundleExecutable')!r}")

        bad = zf.testzip()
        if bad:
            problems.append(f"corrupt entry: {bad}")

    return {"symlinks": symlinks, "executables": executables, "problems": problems}


def sha256(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def human(size: int) -> str:
    return f"{size / 1024 / 1024:.0f} MB"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--arch", default="arm64,x64", help="arm64, x64 or both")
    parser.add_argument("--out", default=os.path.join(ROOT, "release"))
    parser.add_argument("--copy-to-site", action="store_true", help="also drop the zips into website/public/downloads")
    args = parser.parse_args()

    version = app_version()
    electron = electron_version()
    arches = [item.strip() for item in args.arch.split(",") if item.strip()]
    os.makedirs(args.out, exist_ok=True)

    asar_path = prepare_asar(version)
    icns_path = os.path.join(ROOT, "build", "icon.icns")
    if not os.path.exists(icns_path):
        sys.exit("missing build/icon.icns — run `python scripts/make-icns.py` first")

    results = []
    for arch in arches:
        zip_name = f"electron-v{electron}-darwin-{arch}.zip"
        url = f"https://github.com/electron/electron/releases/download/v{electron}/{zip_name}"
        source = os.path.join(CACHE, zip_name)
        download(url, source)

        target = os.path.join(args.out, f"Aegis-{version}-mac-{arch}.zip")
        log(f"assembling {os.path.basename(target)}")
        stats = repack(source, target, asar_path, icns_path, version)
        report = verify(target, version)

        size = os.path.getsize(target)
        digest = sha256(target)
        log(f"  entries {stats['writtenEntries']} (from {stats['sourceEntries']})")
        log(f"  symlinks preserved: {report['symlinks']} · executables: {report['executables']}")
        if report["problems"]:
            for problem in report["problems"]:
                log(f"  PROBLEM: {problem}")
            return 1
        log(f"  {human(size)} · sha256 {digest}")

        if args.copy_to_site:
            destination = os.path.join(ROOT, "website", "public", "downloads", os.path.basename(target))
            os.makedirs(os.path.dirname(destination), exist_ok=True)
            shutil.copyfile(target, destination)
            log(f"  copied to {os.path.relpath(destination, ROOT)}")

        results.append({"arch": arch, "file": os.path.basename(target), "size": human(size), "sha256": digest})

    print(json.dumps(results, indent=2))
    print("\nmacOS first-run notes:")
    print("  right-click the app > Open, or:")
    print("    xattr -dr com.apple.quarantine /Applications/Aegis.app")
    print("  if macOS reports the app is damaged, re-sign it ad-hoc on the Mac:")
    print("    codesign --force --deep --sign - /Applications/Aegis.app")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
