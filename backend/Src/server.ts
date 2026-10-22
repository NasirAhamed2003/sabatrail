import { app } from "./app";
import { config } from "./config";

// ===============================
// START SERVER
// ===============================

app.listen(config.port, () => {
  console.log(`SabaTrail backend server running on port ${config.port}`);
});
