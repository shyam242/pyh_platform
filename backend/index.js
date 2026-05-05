const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI);

app.use("/api/auth", require("./routes/auth"));
app.use("/api/user", require("./routes/user"));

app.listen(5000, () =>
  console.log("Backend running on http://localhost:5000")
);
