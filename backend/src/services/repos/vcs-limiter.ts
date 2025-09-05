import Bottleneck from "bottleneck";

export const vcsLimiter = new Bottleneck({
  maxConcurrent: 4,
});
