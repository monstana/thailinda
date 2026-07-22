const FEATURE_WEIGHTS = [1.2, 2, 2, 1.5, 2, 0.7, 0.7, 0.8];
const OUTER_LIP = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 185, 40, 39, 37, 0, 267, 269, 270, 409];
const HIGH_VISIBILITY_CONSONANTS = new Set([26, 27, 28, 29, 30, 31, 32, 33, 37]);
const MEDIUM_VISIBILITY_CONSONANTS = new Set([8, 9, 10, 11, 12, 34, 35, 36, 38, 39, 40, 41, 43, 44]);

let referencesPromise;
let landmarkerPromise;

function distance(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y, (left.z || 0) - (right.z || 0));
}

function polygonArea(points) {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const next = points[(index + 1) % points.length];
    area += points[index].x * next.y - next.x * points[index].y;
  }
  return Math.abs(area) / 2;
}

export function extractMouthFeatures(landmarks) {
  if (!landmarks || landmarks.length < 468) return null;
  const eyeScale = distance(landmarks[33], landmarks[263]);
  const mouthWidth = distance(landmarks[61], landmarks[291]);
  if (eyeScale < 1e-6 || mouthWidth < 1e-6) return null;

  const outerOpen = distance(landmarks[0], landmarks[17]);
  const innerOpen = distance(landmarks[13], landmarks[14]);
  const outerPoints = OUTER_LIP.map((index) => landmarks[index]);
  const cheekDepth = (landmarks[234].z + landmarks[454].z) / 2;
  const lipDepth = (landmarks[61].z + landmarks[291].z + landmarks[0].z + landmarks[17].z) / 4;

  return [
    mouthWidth / eyeScale,
    outerOpen / eyeScale,
    innerOpen / eyeScale,
    outerOpen / mouthWidth,
    polygonArea(outerPoints) / (eyeScale * eyeScale),
    distance(landmarks[0], landmarks[13]) / eyeScale,
    distance(landmarks[14], landmarks[17]) / eyeScale,
    (lipDepth - cheekDepth) / eyeScale
  ];
}

function smoothSequence(sequence) {
  if (sequence.length < 3) return sequence;
  return sequence.map((_, frameIndex) => {
    const nearby = sequence.slice(Math.max(0, frameIndex - 1), frameIndex + 2);
    return sequence[frameIndex].map((__, featureIndex) => {
      const values = nearby.map((frame) => frame[featureIndex]).sort((a, b) => a - b);
      return values[Math.floor(values.length / 2)];
    });
  });
}

function reduceSequence(sequence, maximumFrames = 42) {
  if (sequence.length <= maximumFrames) return sequence;
  return Array.from({ length: maximumFrames }, (_, index) => {
    const sourceIndex = Math.round((index * (sequence.length - 1)) / (maximumFrames - 1));
    return sequence[sourceIndex];
  });
}

function frameDistance(left, right, weights = FEATURE_WEIGHTS) {
  const squared = left.reduce((sum, value, index) => sum + (weights[index] || 1) * ((value - right[index]) ** 2), 0);
  return Math.sqrt(squared);
}

export function dtwDistance(left, right, weights = FEATURE_WEIGHTS) {
  if (!left?.length || !right?.length) return Number.POSITIVE_INFINITY;
  let previous = new Float64Array(right.length + 1).fill(Number.POSITIVE_INFINITY);
  previous[0] = 0;

  for (const leftFrame of left) {
    const current = new Float64Array(right.length + 1).fill(Number.POSITIVE_INFINITY);
    for (let column = 1; column <= right.length; column += 1) {
      current[column] = frameDistance(leftFrame, right[column - 1], weights)
        + Math.min(current[column - 1], previous[column], previous[column - 1]);
    }
    previous = current;
  }
  return previous[right.length] / (left.length + right.length);
}

export function mouthReferenceKey(item) {
  if (!item?.order) return '';
  if (item.category === 'consonants') return `consonants:${item.order}`;
  if (item.category === 'vowels') return `vowels:${item.order}`;
  return '';
}

export function mouthVisualWeight(item) {
  if (item?.category === 'vowels') return 0.3;
  if (item?.category !== 'consonants') return 0;
  if (HIGH_VISIBILITY_CONSONANTS.has(item.order)) return 0.25;
  if (MEDIUM_VISIBILITY_CONSONANTS.has(item.order)) return 0.12;
  return 0.05;
}

export async function loadMouthReferences() {
  if (!referencesPromise) {
    referencesPromise = fetch('/mouth/references.json', { cache: 'force-cache' }).then(async (response) => {
      if (!response.ok) throw new Error('mouth-references-unavailable');
      return response.json();
    }).catch((error) => {
      referencesPromise = null;
      throw error;
    });
  }
  return referencesPromise;
}

export async function loadFaceLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FaceLandmarker } = await import('@mediapipe/tasks-vision');
      const wasmFileset = {
        wasmLoaderPath: '/mediapipe/wasm/vision_wasm_internal.js',
        wasmBinaryPath: '/mediapipe/wasm/vision_wasm_internal.wasm'
      };
      return FaceLandmarker.createFromOptions(wasmFileset, {
        baseOptions: { modelAssetPath: '/models/face_landmarker.task' },
        runningMode: 'VIDEO',
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false
      });
    })().catch((error) => {
      landmarkerPromise = null;
      throw error;
    });
  }
  return landmarkerPromise;
}

export async function prepareMouthEvaluation() {
  const [landmarker, references] = await Promise.all([loadFaceLandmarker(), loadMouthReferences()]);
  return { landmarker, references };
}

function median(values) {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  if (ordered.length % 2) return ordered[middle];
  return (ordered[middle - 1] + ordered[middle]) / 2;
}

export function evaluateMouthSequence(item, rawSequence, referenceData) {
  const key = mouthReferenceKey(item);
  const visualWeight = mouthVisualWeight(item);
  if (!referenceData) {
    return { status: 'unavailable', reason: 'model-not-ready', visualWeight };
  }
  const reference = referenceData.references?.[key];
  if (!key || !reference) {
    return { status: 'unavailable', reason: 'no-reference', visualWeight };
  }
  if (!rawSequence || rawSequence.length < 5) {
    return { status: 'unavailable', reason: 'not-enough-frames', visualWeight };
  }

  const sequence = reduceSequence(smoothSequence(rawSequence));
  const weights = referenceData.featureWeights || FEATURE_WEIGHTS;
  const distances = reference.sequences
    .map((candidate) => dtwDistance(sequence, candidate, weights))
    .sort((a, b) => a - b);
  const comparisonDistance = median(distances.slice(0, Math.min(3, distances.length)));
  const acceptDistance = reference.acceptDistance || 0.08;
  const scale = acceptDistance / -Math.log(0.7);
  const score = Math.round(Math.max(0, Math.min(100, 100 * Math.exp(-comparisonDistance / scale))));

  return {
    status: comparisonDistance <= acceptDistance ? 'matched' : 'needs-practice',
    score,
    distance: Number(comparisonDistance.toFixed(6)),
    acceptDistance,
    capturedFrames: sequence.length,
    referenceCount: reference.sequences.length,
    visualWeight
  };
}

export function mouthResultMessage(result, audioPassed) {
  if (!audioPassed) return 'Typhoon ยังไม่ยืนยันเสียง จึงยังไม่ใช้รูปปากตัดสินผล';
  if (!result) return 'เสียงผ่านแล้ว · เปิดกล้องเพื่อเสริมการประเมินรูปปากได้';
  if (result.status === 'unavailable') {
    if (result?.reason === 'no-reference') return 'เสียงผ่านแล้ว · รายการนี้ยังไม่มีต้นแบบรูปปาก';
    if (result?.reason === 'model-not-ready') return 'เสียงผ่านแล้ว · ระบบรูปปากยังโหลดไม่เสร็จ ลองอีกครั้งได้';
    return 'เสียงผ่านแล้ว · ยังจับรูปปากได้ไม่ต่อเนื่อง ลองให้ใบหน้าอยู่กลางกรอบ';
  }
  if (result.status === 'matched') return `เสียงผ่าน · รูปปากใกล้เคียงต้นแบบ ${result.score}%`;
  return `เสียงผ่านแล้ว · รูปปาก ${result.score}% ลองปรับตามคำแนะนำแล้วพูดอีกครั้ง`;
}
