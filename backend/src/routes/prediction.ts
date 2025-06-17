import { Request, Response } from "express";
import { convertMetricsMapToObj } from "../utils/metrics";
import { RawQuery } from "../model/query";
import { getQueryByName } from "../queries/config";
import { IntermediaryDatedMetrics, MetricEntry } from "../model/metrics";
import { predict } from "../services/prediction/prediction";
import { predict2 } from "../services/prediction/prediction2";
import { applyTransforms } from "./query";
import { groupBy } from "../utils/grouping";

type PredictionRequest = {
  inputQueries: RawQuery[];
  labelQuery: RawQuery;
};
type QueryResults = Record<string, Record<string, MetricEntry>>;
type NamedQueryResults = Record<string, QueryResults>;

export async function predictLinear(req: Request, res: Response<NamedQueryResults>): Promise<void> {
  const p: PredictionRequest = req.body;

  if (p.inputQueries.length > 2) {
    res.status(400).end("More than 2 input queries are not yet supported");
    return;
  }

  const allResults: Record<string, Map<string, IntermediaryDatedMetrics>> = {};
  const running: Promise<any>[] = [];

  p.inputQueries.forEach((q) => {
    const inputQuery = getQueryByName(q.queryName);
    running.push(
      inputQuery
        .execute(q.args)
        .then((results) => {
          return groupBy(q, results)
        })
        .then((results) => {
          return applyTransforms(q, results);
        })
        .then((results) => {
          allResults[q.queryName] = results;
        }),
    );
  });

  const labelQuery = getQueryByName(p.labelQuery.queryName);
  running.push(
    labelQuery
      .execute(p.labelQuery.args)
      .then((results) => {
        return groupBy(p.labelQuery, results)
      })
      .then((results) => {
        return applyTransforms(p.labelQuery, results);
      })
      .then((results) => {
        allResults[p.labelQuery.queryName] = results;
      }),
  );

  await Promise.all(running);

  const predictionName = `prediction/${p.labelQuery.queryName}`;
  const modelName = `${p.inputQueries.map((q) => q.queryName).join("+")}_${p.labelQuery.queryName}`;

  const labels = allResults[p.labelQuery.queryName];
  let prediction;

  // TODO support more than 2 input datasets
  switch (p.inputQueries.length) {
    case 1: {
      const inputs = allResults[p.inputQueries[0].queryName];
      prediction = await predict(modelName, predictionName, inputs, labels);
      break;
    }
    case 2: {
      const inputs = [allResults[p.inputQueries[0].queryName], allResults[p.inputQueries[1].queryName]];
      prediction = await predict2(modelName, predictionName, inputs, labels);
      break;
    }
  }

  const output: NamedQueryResults = {
    [predictionName]: convertMetricsMapToObj(prediction),
  };
  for (const [queryName, results] of Object.entries(allResults)) {
    output[queryName] = convertMetricsMapToObj(results);
  }

  res.json(output);
}
