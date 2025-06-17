import {TicketManagementTypes} from "../../model/config/common";
import {NoOpTicketService} from "../tickets/noop";
import {registerIssueMgmt} from "./issueMgmtService";

export const initNoOpIssues = () => registerIssueMgmt(TicketManagementTypes.NONE, () => {
  return new NoOpTicketService();
});
