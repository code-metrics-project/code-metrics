export enum OperationState {
  Idle,
  Busy,
  Error,
}

export interface Alert {
  type: "info" | "warning" | "error" | "success";
  message: string;
}
