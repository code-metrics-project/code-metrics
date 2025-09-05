import * as tf from "@tensorflow/tfjs";
import { LayersModel } from "@tensorflow/tfjs";
import { IntermediaryDatedMetrics, MetricEntry } from "../../model/metrics";

const models: Record<string, LayersModel> = {};

async function train(x: number[][], y: number[]): Promise<tf.Sequential> {
  console.log(`Initialising model for ${x.length} inputs`);

  // Train a simple model
  const model = tf.sequential();
  model.add(tf.layers.dense({ units: 32, inputShape: [2], activation: "relu" }));
  model.add(tf.layers.dropout({ rate: 0.1 }));
  // model.add(tf.layers.flatten());
  model.add(tf.layers.dense({ units: 8, activation: "relu" }));
  model.add(tf.layers.dropout({ rate: 0.1 }));
  model.add(tf.layers.dense({ units: 1 })); //, activation: "softmax"}));
  model.compile({ optimizer: "sgd", loss: tf.losses.meanSquaredError });

  // Create tensors from a flat array
  const xs = tf.tensor(x, undefined, "float32");
  // console.log('x shape:', xs.shape);
  const ys = tf.tensor(y, undefined, "float32");

  model.summary();

  console.log("Training model...");
  await model.fit(xs, ys, {
    epochs: 500,
    callbacks: {
      //onEpochEnd: (epoch, log) => console.log(`Epoch ${epoch}: loss = ${log?.loss}`),
    },
  });

  console.log("Model weights:");
  model.weights.forEach((w) => {
    console.log(w.name, w.shape);
  });

  return model;
}

async function makePrediction(model: tf.LayersModel, input: number[]): Promise<number> {
  const prediction = model.predict(tf.tensor([input], null, "float32"));

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const predictedVal = (await prediction.buffer()).get(0, 0);
  console.log(`Predicted value for input: ${input} is ${predictedVal}`);
  return predictedVal;
}

function normalise(unnormalised: number[], max: number): number[] {
  return unnormalised.map((n) => n / max);
}

export async function predict2(
  modelName: string,
  predictionName: string,
  inputs: Map<string, IntermediaryDatedMetrics>[],
  labels: Map<string, IntermediaryDatedMetrics>,
) {
  // date ordered keys
  // FIXME: don't just use the first dimension's keys
  const sortedDates = [...inputs[0].keys()].sort();

  const flatInputsForDate = new Map<string, number[]>();
  const flatLabelsForDate = new Map<string, number>();

  const xs: number[][] = [];
  const ys: number[] = [];

  for (let day = 0; day < sortedDates.length; day++) {
    const date = sortedDates[day];

    const inputValue: number[] = [];

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const inputForDate = input.get(date);
      if (inputForDate) {
        const [entry] = inputForDate.entries.values();
        inputValue[i] = entry.value;
      } else if (day > 0) {
        inputValue[i] = xs[day - 1][i];
      } else {
        inputValue[i] = 0;
      }
    }
    flatInputsForDate.set(date, inputValue);

    const labelForDate = labels.get(date);
    let labelValue;
    if (labelForDate) {
      const [entry] = labelForDate.entries.values();
      labelValue = entry.value;
    } else {
      labelValue = 0;
    }
    flatLabelsForDate.set(date, labelValue);

    // clean up the training data
    // if (day > sortedDates.length * 0.2 && day < sortedDates.length * 0.8) {
    // if (labelValue > 0.01 && labelValue < 0.5) { // 0.99) {
    xs.push(inputValue);
    ys.push(labelValue);
    // }
    // }
  }
  // console.log("flatLabelsForDate", flatLabelsForDate);
  // console.log("flatInputsForDate", flatInputsForDate);

  const { maxInputValue, maxLabelValue, model } = await getModel(modelName, xs, ys);
  // console.log("maxInputValue", maxInputValue);
  // console.log("maxLabelValue", maxLabelValue);

  const predictions = new Map<string, IntermediaryDatedMetrics>();

  for (let i = 0; i < sortedDates.length; i++) {
    const date = sortedDates[i];

    const inputForDate = flatInputsForDate.get(date)!;
    const normalisedInputForDate = inputForDate.map((num, idx) => num / maxInputValue[idx]);
    let prediction = await makePrediction(model, normalisedInputForDate);

    console.log(">>>>>>>>>>>>>>>>>>>>");
    console.log("inputForDate", inputForDate);
    console.log("normalisedInputForDate", normalisedInputForDate);
    console.log("prediction", prediction);

    // denormalise prediction
    prediction *= maxLabelValue;

    console.log("predictionDenormalised", prediction);
    console.log("<<<<<<<<<<<<<<<<<<<<");

    // // start from same point as actual data
    // if (i < 10) {
    //   prediction = flatLabelsForDate.get(date)!;
    // }

    const entries = new Map<string, MetricEntry>();
    entries.set(predictionName, { date, value: prediction });
    predictions.set(date, { entries });
  }
  return predictions;
}

/**
 * `xs` is in the form:
 *
 * [entry index] => value[dimension]
 *
 * e.g.
 *
 * [0] => [10, 100]
 * [1] => [9, 200]
 * [3] => [8, 300]
 */
async function getModel(modelName: string, xs: number[][], ys: number[]) {
  //console.log(`xs`, xs);
  //console.log(`ys`, ys);

  // calc max for each dimension
  const maxInputValue = [];
  for (let d = 0; d < xs[0].length; d++) {
    const singleDim = xs.map((x) => x[d]);
    maxInputValue[d] = Math.max(...singleDim);
  }

  const xsnormalised = xs.map((x) => {
    return x.map((xval, d) => {
      const max = maxInputValue[d];
      return xval / max;
    });
  });
  //console.log(`xsnormalised`, xsnormalised);

  //const maxInputValue = xs.map((x) => Math.max(...x));
  //console.log("maxInputValue", maxInputValue);

  const maxLabelValue = Math.max(...ys);
  const ysnormalised = normalise(ys, maxLabelValue);
  //console.log(`ysnormalised`, ysnormalised);

  let model = models[modelName];
  if (model) {
    console.log(`Using existing model: ${modelName}`);
  } else {
    model = await train(xsnormalised, ysnormalised);
    models[modelName] = model;
  }

  return { maxInputValue, maxLabelValue, model };
}
