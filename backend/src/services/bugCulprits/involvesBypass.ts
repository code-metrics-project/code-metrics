import { logger } from "../../utils/logger/logger";
import { CompletePrInfo } from "../../model/vcs";

export type PrBypassInfo = {
  isBypassed: boolean;
  bypassReason: string | undefined;
  prTitle: string | undefined;
};

type Result = {
  numberOfPrs: number;
  prsThatMeetCriteria: PrBypassInfo[];
  percentageThatMeetCriteria: string;
};

const print = (result: Result) => {
  const { numberOfPrs, prsThatMeetCriteria, percentageThatMeetCriteria } = result;

  logger(
    `${prsThatMeetCriteria.length}/${numberOfPrs} (${percentageThatMeetCriteria}) involved bypassing status check policies.`,
  );
  prsThatMeetCriteria.forEach((pr: PrBypassInfo) => {
    logger(`${pr.prTitle}: Bypass Reason: ${pr.bypassReason}`);
  });
};

export const involvesBypass = (prs: CompletePrInfo[]) => {
  const prsInfo: PrBypassInfo[] = prs.map((prComplete) => {
    const { pr } = prComplete;
    return {
      isBypassed: !!pr.completionOptions?.bypassPolicy,
      bypassReason: pr.completionOptions?.bypassReason,
      prTitle: pr.title,
    };
  });

  const numberOfPrs = prs.length;
  const prsThatMeetCriteria = prsInfo.filter((res) => res.isBypassed);
  const percentageThatMeetCriteria = (prsThatMeetCriteria.length / numberOfPrs) * 100;

  const result = {
    numberOfPrs,
    prsThatMeetCriteria,
    percentageThatMeetCriteria: `${Math.round(percentageThatMeetCriteria)}%`,
  };

  print(result);

  return result;
};
