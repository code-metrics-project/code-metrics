import * as tf from "@tensorflow/tfjs";
import { LayersModel } from "@tensorflow/tfjs";
import { IntermediaryDatedMetrics, MetricEntry } from "../../model/metrics";
import _ from "lodash/fp";
import { logger, verbose } from "../../utils/logger/logger.js";

const models: Record<string, LayersModel> = {};

async function train(x: number[], y: number[]): Promise<tf.Sequential> {
  logger(`Initialising model for ${x.length} inputs`);

  // Train a simple model
  const model = tf.sequential();
  model.add(tf.layers.dense({ units: 1, inputShape: [1] }));
  model.compile({ optimizer: "sgd", loss: tf.losses.meanSquaredError });

  // Create tensors from a flat array
  const xs = tf.tensor(x, undefined, "float32");
  verbose("x shape:", xs.shape);
  const ys = tf.tensor(y, undefined, "float32");

  model.summary();

  logger("Training model...");
  await model.fit(xs, ys, {
    epochs: 500,
    callbacks: {
      onEpochEnd: (epoch, log) => verbose(`Epoch ${epoch}: loss = ${log?.loss}`),
    },
  });

  // verbose("Model weights:");
  // model.weights.forEach((w) => {
  //   verbose(w.name, w.shape);
  // });

  return model;
}

async function makePrediction(model: tf.LayersModel, input: number): Promise<number> {
  const prediction = model.predict(tf.tensor([input], undefined, "float32"));

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const predictedVal = (await prediction.buffer()).get(0, 0);
  verbose(`Predicted value for input: ${input} is ${predictedVal}`);
  return predictedVal;
}

function normalise(unnormalised: number[]): number[] {
  const max = _.max(unnormalised)!;
  return unnormalised.map((n) => n / max);
}

export async function predict(
  modelName: string,
  predictionName: string,
  inputs: Map<string, IntermediaryDatedMetrics>,
  labels: Map<string, IntermediaryDatedMetrics>,
) {
  // date ordered keys
  const sortedDates = [...inputs.keys()].sort();

  const flatInputsForDate = new Map<string, number>();
  const flatLabelsForDate = new Map<string, number>();

  const xs: number[] = [];
  const ys: number[] = [];

  for (let day = 0; day < sortedDates.length; day++) {
    const date = sortedDates[day];
    const inputForDate = inputs.get(date);
    let inputValue: number;
    if (inputForDate) {
      const [entry] = inputForDate.entries.values();
      inputValue = entry.value;
    } else if (day > 0) {
      inputValue = xs[day - 1];
    } else {
      inputValue = 0;
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
    //if (day > sortedDates.length * 0.2 && day < sortedDates.length * 0.8) {
    // if (labelValue > 0.01 && labelValue < 0.5) { // 0.99) {
    xs.push(inputValue);
    ys.push(labelValue);
    // }
    //}
  }

  const { maxInputValue, maxLabelValue, model } = await getModel(modelName, xs, ys);

  const predictions = new Map<string, IntermediaryDatedMetrics>();

  for (let i = 0; i < sortedDates.length; i++) {
    const date = sortedDates[i];

    const inputForDate = flatInputsForDate.get(date)!;
    const normalisedInputForDate = inputForDate / maxInputValue;
    let prediction = await makePrediction(model, normalisedInputForDate);

    verbose(">>>>>>>>>>>>>>>>>>>>");
    verbose("inputForDate", inputForDate);
    verbose("normalisedInputForDate", normalisedInputForDate);
    verbose("prediction", prediction);

    // denormalise prediction
    prediction *= maxLabelValue;

    verbose("predictionDenormalised", prediction);
    verbose("<<<<<<<<<<<<<<<<<<<<");

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

async function getModel(modelName: string, xs: number[], ys: number[]) {
  // verbose(`xs`, xs);
  const xsnormalised = normalise(xs);
  // verbose(`xsnormalised`, xsnormalised);
  const maxInputValue = _.max(xs)!;

  // verbose(`ys`, ys);
  const ysnormalised = normalise(ys);
  // verbose(`ysnormalised`, ysnormalised);
  const maxLabelValue = _.max(ys)!;

  let model = models[modelName];
  if (model) {
    logger(`Using existing model: ${modelName}`);
  } else {
    model = await train(xsnormalised, ysnormalised);
    models[modelName] = model;
  }
  return { maxInputValue, maxLabelValue, model };
}
