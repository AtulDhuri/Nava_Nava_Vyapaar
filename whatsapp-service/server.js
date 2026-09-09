const envFile = process.env.NODE_ENV === "production" ? ".env.prod" : ".env";
require("dotenv").config({ path: envFile });

const express = require("express");
const whatsappRoutes = require("./src/routes/whatsappRoutes");

const app = express();
app.use(express.json());

app.get("/health", (req, res) => res.status(200).json({ status: "success", displayMessage: "WhatsApp service is running" }));
app.use("/api/whatsapp", whatsappRoutes);

app.listen(process.env.PORT, () => console.log(`WhatsApp service running on port ${process.env.PORT}`));
