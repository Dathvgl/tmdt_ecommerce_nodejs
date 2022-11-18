import cors from "cors";
import * as dotenv from "dotenv";
import express from "express";
import http from "http";

import cartRoute from "./routes/cart.route.js";
import categoryRoute from "./routes/category.route.js";
import paymentRoute from "./routes/payment.route.js";
import productRoute from "./routes/product.route.js";
import userRoute from "./routes/user.route.js";

dotenv.config();

const app = express();
app.use(cors());

const server = http.createServer(app);

app.use("/cart", cartRoute);
app.use("/category", categoryRoute);
app.use("/payment", paymentRoute);
app.use("/product", productRoute);
app.use("/user", userRoute);

app.get("/", (req, res) => {
  res.send("Hello World");
});

server.listen(process.env?.PORT, () => {
  const port = process.env?.PORT;
  console.log(`Server đang chạy trên cổng ${port}`);
});
