/**
 * Offline training script for the ASL hand sign classifier.
 *
 * Usage:
 *   npx tsx scripts/train-model.ts <path-to-training-data.json>
 *
 * The training data JSON should be an array of objects:
 *   { label: string, features: number[72] }
 *
 * Outputs a TensorFlow.js web model to public/models/asl-classifier/
 */

import * as tf from "@tensorflow/tfjs";
import * as fs from "fs";
import * as path from "path";

// Must match CLASS_LABELS in src/lib/mlClassifier.ts
const CLASS_LABELS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  "ILY",
  "GOOD",
  "BAD",
  "OK",
  "STOP",
  "HI",
];

const NUM_FEATURES = 72;
const NUM_CLASSES = CLASS_LABELS.length;

interface Sample {
  label: string;
  features: number[];
}

// ---- Data Augmentation ----

function augmentSample(features: number[]): number[] {
  const augmented = [...features];

  // Random rotation around z-axis (±15 degrees) on landmark coords
  const angle = ((Math.random() - 0.5) * 30 * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  for (let i = 0; i < 21; i++) {
    const x = augmented[i * 3];
    const y = augmented[i * 3 + 1];
    augmented[i * 3] = x * cos - y * sin;
    augmented[i * 3 + 1] = x * sin + y * cos;
  }

  // Random scale (0.85 - 1.15)
  const scale = 0.85 + Math.random() * 0.3;
  for (let i = 0; i < 63; i++) {
    augmented[i] *= scale;
  }

  // Random noise (small Gaussian)
  for (let i = 0; i < 63; i++) {
    augmented[i] += (Math.random() - 0.5) * 0.01;
  }

  return augmented;
}

// ---- Main ----

async function main() {
  const dataPath = process.argv[2];
  if (!dataPath) {
    console.error("Usage: npx tsx scripts/train-model.ts <training-data.json>");
    process.exit(1);
  }

  console.log(`Loading data from ${dataPath}...`);
  const raw: Sample[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  console.log(`Loaded ${raw.length} samples`);

  // Filter out samples with unknown labels
  const data = raw.filter((s) => CLASS_LABELS.includes(s.label));
  console.log(`Using ${data.length} samples with valid labels`);

  // Print class distribution
  const dist = new Map<string, number>();
  for (const s of data) {
    dist.set(s.label, (dist.get(s.label) || 0) + 1);
  }
  console.log("\nClass distribution:");
  for (const label of CLASS_LABELS) {
    console.log(`  ${label}: ${dist.get(label) || 0}`);
  }

  // Augment data (3x augmentation)
  const augmented: Sample[] = [...data];
  for (const sample of data) {
    for (let i = 0; i < 3; i++) {
      augmented.push({
        label: sample.label,
        features: augmentSample(sample.features),
      });
    }
  }
  console.log(`\nAfter augmentation: ${augmented.length} samples`);

  // Shuffle
  for (let i = augmented.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [augmented[i], augmented[j]] = [augmented[j], augmented[i]];
  }

  // Split 80/10/10
  const trainEnd = Math.floor(augmented.length * 0.8);
  const valEnd = Math.floor(augmented.length * 0.9);

  const trainData = augmented.slice(0, trainEnd);
  const valData = augmented.slice(trainEnd, valEnd);
  const testData = augmented.slice(valEnd);

  console.log(
    `Split: ${trainData.length} train, ${valData.length} val, ${testData.length} test`,
  );

  // Convert to tensors
  function toTensors(samples: Sample[]) {
    const xs = tf.tensor2d(
      samples.map((s) => s.features),
      [samples.length, NUM_FEATURES],
    );
    const labels = samples.map((s) => CLASS_LABELS.indexOf(s.label));
    const ys = tf.oneHot(tf.tensor1d(labels, "int32"), NUM_CLASSES);
    return { xs, ys };
  }

  const train = toTensors(trainData);
  const val = toTensors(valData);
  const test = toTensors(testData);

  // Build model
  const model = tf.sequential();

  model.add(
    tf.layers.dense({
      inputShape: [NUM_FEATURES],
      units: 128,
      activation: "relu",
    }),
  );
  model.add(tf.layers.dropout({ rate: 0.3 }));

  model.add(tf.layers.dense({ units: 64, activation: "relu" }));
  model.add(tf.layers.dropout({ rate: 0.2 }));

  model.add(tf.layers.dense({ units: NUM_CLASSES, activation: "softmax" }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"],
  });

  model.summary();

  // Train
  console.log("\nTraining...");
  await model.fit(train.xs, train.ys, {
    epochs: 50,
    batchSize: 32,
    validationData: [val.xs, val.ys],
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        console.log(
          `  Epoch ${epoch + 1}: loss=${logs?.loss?.toFixed(4)} acc=${logs?.acc?.toFixed(4)} val_loss=${logs?.val_loss?.toFixed(4)} val_acc=${logs?.val_acc?.toFixed(4)}`,
        );
      },
    },
  });

  // Evaluate on test set
  console.log("\nEvaluating on test set...");
  const evalResult = model.evaluate(test.xs, test.ys) as tf.Tensor[];
  const testLoss = (evalResult[0].dataSync() as Float32Array)[0];
  const testAcc = (evalResult[1].dataSync() as Float32Array)[0];
  console.log(
    `Test loss: ${testLoss.toFixed(4)}, Test accuracy: ${testAcc.toFixed(4)}`,
  );

  // Save model
  const outDir = path.resolve(
    __dirname,
    "..",
    "public",
    "models",
    "asl-classifier",
  );
  fs.mkdirSync(outDir, { recursive: true });
  await model.save(`file://${outDir}`);
  console.log(`\nModel saved to ${outDir}`);

  // Cleanup
  train.xs.dispose();
  train.ys.dispose();
  val.xs.dispose();
  val.ys.dispose();
  test.xs.dispose();
  test.ys.dispose();
  for (const t of evalResult) t.dispose();
}

main().catch(console.error);
