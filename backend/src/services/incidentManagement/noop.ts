import { registerIncidentMgmt } from "./incidentMgmtService";
import { TicketManagementTypes } from "../../model/config/common";
import { NoOpTicketService } from "../tickets/noop";

export const initNoOpIncidents = () =>
  registerIncidentMgmt(TicketManagementTypes.NONE, () => {
    return new NoOpTicketService();
  });
