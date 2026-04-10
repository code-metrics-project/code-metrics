import admin from "./pages/admin";
import auth from "./pages/auth";
import insights from "./pages/insights";
import overview from "./pages/overview";
import support from "./pages/support";

export default {
  ...overview,
  ...insights,
  ...auth,
  ...support,
  ...admin,
};
