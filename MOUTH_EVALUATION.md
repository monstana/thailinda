# Mouth evaluation (MediaPipe + DTW)

ThaiLinda keeps Typhoon ASR as the pass/fail authority. Mouth evaluation is an
optional, local visual aid: it never turns a failed Typhoon result into a pass.

## Runtime flow

1. The learner opens the camera on a consonant or vowel lesson.
2. MediaPipe Face Landmarker runs in the browser and extracts eight normalized
   mouth-shape features while the speak button is held.
3. DTW compares that sequence with the seven local references for the current
   learning item.
4. The UI reports a supplementary mouth score and keeps Typhoon's result as the
   recorded assessment result.

No learner video or face landmarks are uploaded. Assessment history stores only
the status, score, DTW distance, frame count and visual weight.

## Rebuilding references

The committed `static/mouth/references.json` is generated from `VDO/alphabet`
and `VDO/vowel`. To rebuild it:

```powershell
python -m pip install -r scripts/requirements-mouth.txt
npm run mouth:references
```

The generator stores normalized numeric features only; it does not copy frames,
faces or audio into the web assets.

## Local verification

```powershell
npm run check
npm run build
npm run dev
```

Camera access requires `localhost` or HTTPS. Words currently remain audio-only
because the VDO dataset contains references for consonants and vowels only.
