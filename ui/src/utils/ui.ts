export enum OperationState {
  Idle,
  Busy,
  Error,
}

export type Alert = {
  type: "info" | "warning" | "error";
  message: string;
};
