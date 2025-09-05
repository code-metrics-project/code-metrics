import { Request, Response } from "express";
import { LightweightSarif } from "../model/vulnerabilities";
import { persistVulnerabilitiesForWorkload } from "../services/vulnerabilities/vulnerabilities";
import * as core from "express-serve-static-core";

type PersistVulnsQueryParams = { workload: string; repoName?: string; reportDate: string };

// e.g. POST /api/vulnerabilities?workload=foo&repoName=bar&reportDate=2023-12-11
export const persistVulnerabilities = async (
  req: Request<core.ParamsDictionary, any, LightweightSarif, PersistVulnsQueryParams>,
  res: Response,
): Promise<void> => {
  const payload = await req.body;
  await persistVulnerabilitiesForWorkload(
    req.query.workload,
    req.query.repoName,
    new Date(req.query.reportDate),
    payload,
  );
  res.status(201).end();
};
