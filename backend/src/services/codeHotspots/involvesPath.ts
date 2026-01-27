import { logger } from "../../utils/logger/logger";
import { CompletePrInfo } from "../../model/vcs";

type Result = {
  path: string;
  numberOfPrs: number;
  numberThatMeetCriteria: number;
  percentageThatMeetCriteria: string;
};

const print = (result: Result) => {
  const { path, numberOfPrs, numberThatMeetCriteria, percentageThatMeetCriteria } = result;

  logger(
    `${numberThatMeetCriteria}/${numberOfPrs} (${percentageThatMeetCriteria}) involved changes to source path: '${path}'.`,
  );
};

const evaluatePrForChanges = ({ filesChanged }: CompletePrInfo, srcPath: string) => {
  const paths = filesChanged.map((item) => item && item.path).flat();

  return !!paths.find((path) => path && path.includes(srcPath));
};

export const involvesPath = (prs: CompletePrInfo[], path: string) => {
  const results = prs.map((pr) => evaluatePrForChanges(pr, path));

  const numberOfPrs = prs.length;
  const numberThatMeetCriteria = results.filter((r) => r).length;
  const percentageThatMeetCriteria = (numberThatMeetCriteria / numberOfPrs) * 100;

  const result = {
    path,
    numberOfPrs,
    numberThatMeetCriteria,
    percentageThatMeetCriteria: `${Math.round(percentageThatMeetCriteria)}%`,
  };

  print(result);

  return result;
};
