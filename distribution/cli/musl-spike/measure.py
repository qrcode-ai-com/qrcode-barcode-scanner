#!/usr/bin/env python3
"""Time two builds of qrscan on the same host, for the musl spike.

  measure.py --musl PATH --gnu PATH --fixtures DIR --out FILE

Each build scans each image with each profile nine times, with no time budget, one scan after
the other. The file records every duration, the median and the ratio of the two medians. It
judges nothing: a slower build is a fact to weigh, not a failure. Stdlib only.
"""
import argparse
import json
import pathlib
import platform
import statistics
import subprocess
import time

IMAGES = ("symbology/mixed-code128-qr.png", "clean/gen_v5_q.png", "degraded/FAIL_1491ms_0_584c998c.png")
PROFILES = ("fast", "frame", "full")
RUNS = 9


def scan(binary, image, profile):
    start = time.perf_counter()
    done = subprocess.run([binary, str(image), "--profile", profile, "--budget-ms", "0"],
                          capture_output=True, check=False)
    elapsed = (time.perf_counter() - start) * 1000
    if done.returncode not in (0, 1):
        raise SystemExit(f"{binary} {image.name} {profile}: exit {done.returncode}: {done.stderr.decode()[:200]}")
    return round(elapsed, 1), done.returncode, len(json.loads(done.stdout)["detections"])


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--musl", required=True)
    parser.add_argument("--gnu", required=True)
    parser.add_argument("--fixtures", required=True, type=pathlib.Path)
    parser.add_argument("--out", required=True, type=pathlib.Path)
    args = parser.parse_args()
    builds = {"musl": args.musl, "gnu": args.gnu}
    rows = []
    for image in IMAGES:
        for profile in PROFILES:
            row = {"image": image, "profile": profile}
            for name, binary in builds.items():
                scan(binary, args.fixtures / image, profile)  # one scan first: the file is then in the page cache
                runs = [scan(binary, args.fixtures / image, profile) for _ in range(RUNS)]
                row[name] = {"milliseconds": [run[0] for run in runs],
                             "median": statistics.median(run[0] for run in runs),
                             "exit": sorted({run[1] for run in runs}),
                             "detections": sorted({run[2] for run in runs})}
            row["musl_over_gnu"] = round(row["musl"]["median"] / row["gnu"]["median"], 2)
            row["same_result"] = (row["musl"]["exit"], row["musl"]["detections"]) == (row["gnu"]["exit"], row["gnu"]["detections"])
            rows.append(row)
            print(f"{image} {profile}: musl {row['musl']['median']} ms, gnu {row['gnu']['median']} ms, "
                  f"ratio {row['musl_over_gnu']}, same result {row['same_result']}")
    result = {"machine": platform.machine(), "runs_per_cell": RUNS,
              "bytes": {name: pathlib.Path(binary).stat().st_size for name, binary in builds.items()},
              "rows": rows,
              "median_ratio": statistics.median(row["musl_over_gnu"] for row in rows)}
    args.out.write_text(json.dumps(result, indent=2) + "\n")
    print(f"median ratio over {len(rows)} cells: {result['median_ratio']}")


if __name__ == "__main__":
    main()
