"""Build compact mouth-motion references from the local VDO dataset.

The generated JSON contains only normalized numeric features. Raw video frames,
faces and audio are never copied into the web application.
"""

from __future__ import annotations

import argparse
import json
import math
import os
from pathlib import Path
import statistics
import sys


extra_dependencies = os.environ.get("THAILINDA_PYTHON_DEPS")
if extra_dependencies:
    sys.path.insert(0, extra_dependencies)

import cv2  # type: ignore  # noqa: E402
import mediapipe as mp  # type: ignore  # noqa: E402
import numpy as np  # type: ignore  # noqa: E402


FEATURE_NAMES = [
    "mouthWidth",
    "outerOpen",
    "innerOpen",
    "roundness",
    "outerArea",
    "upperLip",
    "lowerLip",
    "protrusion",
]
FEATURE_WEIGHTS = [1.2, 2.0, 2.0, 1.5, 2.0, 0.7, 0.7, 0.8]
OUTER_LIP = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 185, 40, 39, 37, 0, 267, 269, 270, 409]


def distance(a, b) -> float:
    return math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2)


def polygon_area(points) -> float:
    return abs(
        sum(
            points[index].x * points[(index + 1) % len(points)].y
            - points[(index + 1) % len(points)].x * points[index].y
            for index in range(len(points))
        )
    ) / 2


def mouth_features(landmarks) -> list[float] | None:
    eye_scale = distance(landmarks[33], landmarks[263])
    mouth_width_raw = distance(landmarks[61], landmarks[291])
    if eye_scale < 1e-6 or mouth_width_raw < 1e-6:
        return None

    outer_open = distance(landmarks[0], landmarks[17])
    inner_open = distance(landmarks[13], landmarks[14])
    outer_points = [landmarks[index] for index in OUTER_LIP]
    cheek_depth = (landmarks[234].z + landmarks[454].z) / 2
    lip_depth = (landmarks[61].z + landmarks[291].z + landmarks[0].z + landmarks[17].z) / 4

    return [
        mouth_width_raw / eye_scale,
        outer_open / eye_scale,
        inner_open / eye_scale,
        outer_open / mouth_width_raw,
        polygon_area(outer_points) / (eye_scale * eye_scale),
        distance(landmarks[0], landmarks[13]) / eye_scale,
        distance(landmarks[14], landmarks[17]) / eye_scale,
        (lip_depth - cheek_depth) / eye_scale,
    ]


def smooth_sequence(sequence: list[list[float]]) -> list[list[float]]:
    if len(sequence) < 3:
        return sequence
    smoothed = []
    for index in range(len(sequence)):
        start = max(0, index - 1)
        end = min(len(sequence), index + 2)
        smoothed.append([
            statistics.median(frame[feature] for frame in sequence[start:end])
            for feature in range(len(FEATURE_NAMES))
        ])
    return smoothed


def reduce_sequence(sequence: list[list[float]], maximum_frames: int = 42) -> list[list[float]]:
    if len(sequence) <= maximum_frames:
        return sequence
    indices = np.linspace(0, len(sequence) - 1, maximum_frames).round().astype(int)
    return [sequence[index] for index in indices]


def frame_distance(left: list[float], right: list[float]) -> float:
    return math.sqrt(sum(
        FEATURE_WEIGHTS[index] * (left[index] - right[index]) ** 2
        for index in range(len(FEATURE_NAMES))
    ))


def dtw_distance(left: list[list[float]], right: list[list[float]]) -> float:
    if not left or not right:
        return math.inf
    previous = [math.inf] * (len(right) + 1)
    previous[0] = 0.0
    for left_frame in left:
        current = [math.inf] * (len(right) + 1)
        for column, right_frame in enumerate(right, start=1):
            current[column] = frame_distance(left_frame, right_frame) + min(
                current[column - 1], previous[column], previous[column - 1]
            )
        previous = current
    return previous[-1] / (len(left) + len(right))


def percentile(values: list[float], fraction: float) -> float:
    ordered = sorted(values)
    if not ordered:
        return 0.04
    position = (len(ordered) - 1) * fraction
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    return ordered[lower] * (upper - position) + ordered[upper] * (position - lower)


def acceptance_distance(sequences: list[list[list[float]]]) -> float:
    nearest = []
    for index, sequence in enumerate(sequences):
        candidates = [
            dtw_distance(sequence, other)
            for other_index, other in enumerate(sequences)
            if other_index != index
        ]
        if candidates:
            nearest.append(statistics.median(sorted(candidates)[: min(3, len(candidates))]))
    # References were filmed in controlled conditions. The extra margin makes
    # the feedback supportive when used with a different face/camera.
    return round(min(0.28, max(0.025, percentile(nearest, 0.90) * 2.0)), 6)


def natural_sort_key(path: Path) -> tuple[int, int]:
    class_index, take = path.stem.split("_", 1)
    return int(class_index), int(take)


def extract_video(
    landmarker, path: Path, target_fps: float, timestamp_offset: int, max_width: int
) -> tuple[list[list[float]], dict]:
    capture = cv2.VideoCapture(str(path))
    if not capture.isOpened():
        raise RuntimeError(f"เปิดวิดีโอไม่ได้: {path}")

    source_fps = capture.get(cv2.CAP_PROP_FPS) or 30.0
    interval = max(1, round(source_fps / target_fps))
    sequence: list[list[float]] = []
    sampled = 0
    detected = 0
    frame_index = 0

    while True:
        ok, frame = capture.read()
        if not ok:
            break
        if frame_index % interval == 0:
            sampled += 1
            if frame.shape[1] > max_width:
                scale = max_width / frame.shape[1]
                frame = cv2.resize(
                    frame,
                    (max_width, round(frame.shape[0] * scale)),
                    interpolation=cv2.INTER_AREA,
                )
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            image = mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb))
            timestamp_ms = timestamp_offset + int(frame_index * 1000 / source_fps)
            result = landmarker.detect_for_video(image, timestamp_ms)
            if result.face_landmarks:
                features = mouth_features(result.face_landmarks[0])
                if features:
                    detected += 1
                    sequence.append(features)
        frame_index += 1

    capture.release()
    sequence = reduce_sequence(smooth_sequence(sequence))
    return sequence, {
        "sampledFrames": sampled,
        "detectedFrames": detected,
        "coverage": round(detected / sampled, 4) if sampled else 0,
    }


def build_references(args) -> dict:
    base_options = mp.tasks.BaseOptions(model_asset_path=str(args.model.resolve()))
    options = mp.tasks.vision.FaceLandmarkerOptions(
        base_options=base_options,
        running_mode=mp.tasks.vision.RunningMode.VIDEO,
        num_faces=1,
        min_face_detection_confidence=0.5,
        min_face_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    references: dict[str, dict] = {}
    failures = []
    processed = 0
    video_number = 0

    with mp.tasks.vision.FaceLandmarker.create_from_options(options) as landmarker:
        for folder, category in (("alphabet", "consonants"), ("vowel", "vowels")):
            files = sorted((args.input / folder).glob("*.mov"), key=natural_sort_key)
            if args.limit:
                files = files[: args.limit]
            for path in files:
                video_number += 1
                class_index, take = natural_sort_key(path)
                key = f"{category}:{class_index}"
                try:
                    sequence, quality = extract_video(
                        landmarker,
                        path,
                        args.fps,
                        video_number * 10_000,
                        args.max_width,
                    )
                except Exception as error:  # keep processing the rest of the dataset
                    failures.append({"file": str(path), "error": str(error)})
                    continue
                if len(sequence) < 5:
                    failures.append({"file": str(path), "error": "ตรวจพบใบหน้าไม่เพียงพอ"})
                    continue
                references.setdefault(key, {"sequences": [], "takes": [], "quality": []})
                references[key]["sequences"].append([
                    [round(value, 5) for value in frame] for frame in sequence
                ])
                references[key]["takes"].append(take)
                references[key]["quality"].append(quality)
                processed += 1
                if processed % 25 == 0:
                    print(f"processed {processed} videos", flush=True)

    for reference in references.values():
        reference["acceptDistance"] = acceptance_distance(reference["sequences"])
        reference["medianCoverage"] = round(statistics.median(
            quality["coverage"] for quality in reference.pop("quality")
        ), 4)

    return {
        "version": 1,
        "generatedFrom": "VDO/alphabet and VDO/vowel",
        "sampleRateFps": args.fps,
        "featureNames": FEATURE_NAMES,
        "featureWeights": FEATURE_WEIGHTS,
        "processedVideos": processed,
        "failedVideos": failures,
        "references": references,
    }


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=root / "VDO")
    parser.add_argument("--model", type=Path, default=root / "static/models/face_landmarker.task")
    parser.add_argument("--output", type=Path, default=root / "static/mouth/references.json")
    parser.add_argument("--fps", type=float, default=12.0)
    parser.add_argument("--max-width", type=int, default=640)
    parser.add_argument("--limit", type=int, default=0, help="Process N files per folder for a smoke test")
    parser.add_argument("--recalibrate-only", action="store_true")
    args = parser.parse_args()

    if args.recalibrate_only:
        result = json.loads(args.output.read_text(encoding="utf-8"))
        for reference in result["references"].values():
            reference["acceptDistance"] = acceptance_distance(reference["sequences"])
        args.output.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        print(f"recalibrated {len(result['references'])} classes in {args.output}")
        return

    result = build_references(args)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(
        f"wrote {args.output} ({result['processedVideos']} videos, "
        f"{len(result['failedVideos'])} failures, {len(result['references'])} classes)"
    )


if __name__ == "__main__":
    main()
