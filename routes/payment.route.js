import axios from "axios";
import bodyParser from "body-parser";
import * as dotenv from "dotenv";
import express from "express";
import { FieldValue } from "firebase-admin/firestore";
import { nanoid } from "nanoid";
import Stripe from "stripe";
import { fs } from "../firebase/admin/config.js";
import { paymentObj } from "../model/payment.model.js";

dotenv.config();

const node = process.env?.HOST_NODE;

const clientURL = process.env?.HOST_CLIENT;
const stripeSkKey = process.env?.STRIPE_SK_KEY;

const router = express.Router();
const jsonParser = bodyParser.json();
const stripe = new Stripe(stripeSkKey);

const paymentName = "DonHang";

router.get("/", async (req, res) => {
  await fs
    .collection(paymentName)
    .get()
    .then((snap) => {
      const data = [];
      snap.forEach((doc) => data.push({ ...doc.data(), userId: doc.id }));
      res.status(200).send(data);
    })
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;

  await fs
    .collection(paymentName)
    .doc(id)
    .get()
    .then((snap) => {
      if (snap.exists) {
        const data = snap.data();
        res.status(200).send(data);
      } else res.status(200).send(null);
    })
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });
});

router.post("/create-checkout-session", jsonParser, async (req, res) => {
  const { user, item } = req.body;

  const line_items = item?.map((x) => ({
    price_data: {
      currency: "vnd",
      product_data: {
        name: x.ten,
        images: [x.hinhAnh],
        metadata: {
          id: x.id,
        },
      },
      unit_amount: x.giaGoc - (x.giaGoc * x.giamGia) / 100,
    },
    quantity: x.soLuong,
  }));

  const session = await stripe.checkout.sessions.create({
    client_reference_id: user?.id,
    customer_email: user?.email,
    line_items,
    mode: "payment",
    success_url: clientURL,
    cancel_url: `${clientURL}/GioHang`,
  });

  res.send({ url: session.url });
});

router.post("/:id", async (req, res) => {
  const { id } = req.params;

  const payment = {
    chiTiet: {},
    soLuong: 0,
    thanhLap: "",
  };

  const date = new Date();
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();

  const today = `${yyyy}-${mm}-${dd}`;

  payment.thanhLap = today;

  await fs
    .collection(paymentName)
    .doc(id)
    .create(payment)
    .then((_) => res.sendStatus(201))
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });
});

router.put("/:id", jsonParser, async (req, res) => {
  const { id } = req.params;
  const { num, item, products } = req.body;
  const newMoon = JSON.parse(JSON.stringify(paymentObj));
  const key = nanoid();

  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();

  const time = today.toLocaleTimeString().split(":");
  const hh = time[0];
  const mn = time[1];

  newMoon.id = key;
  newMoon.gioHangId = item?.id;
  newMoon.hoTen = item?.hoTen;
  newMoon.diaChi = item?.diaChi;
  newMoon.thanhTien = item?.thanhTien;
  newMoon.ngayDatHang = `${yyyy}-${mm}-${dd}:${hh}-${mn}`;
  newMoon.tinhTrang = "Đang giao";

  const three = new Date(today.setDate(today.getDate() + 3));
  const ddT = String(three.getDate()).padStart(2, "0");
  const mmT = String(three.getMonth() + 1).padStart(2, "0");
  const yyyyT = three.getFullYear();

  newMoon.ngayGiaoHang = `${yyyyT}-${mmT}-${ddT}`;

  newMoon.sanPham = Object.assign({}, products);

  const promises = [];
  products?.forEach(({ id, soLuong }) => {
    promises.push(
      axios.put(`${node}/product/${id}/quantity`, {
        id,
        quantity: soLuong * -1,
      })
    );
  });

  await Promise.all(promises).catch((error) => {
    console.error(error);
    res.sendStatus(500);
  });

  await axios.delete(`${node}/cart/${id}`).catch((error) => {
    console.error(error);
    res.sendStatus(500);
  });

  await axios.post(`${node}/cart/${id}`).catch((error) => {
    console.error(error);
    res.sendStatus(500);
  });

  await fs
    .collection(paymentName)
    .doc(id)
    .update({ soLuong: FieldValue.increment(1) })
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });

  await fs
    .collection(paymentName)
    .doc(id)
    .update({ [`chiTiet.${num}`]: newMoon })
    .then((_) => res.sendStatus(200))
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });
});

router.put("/:id/pay", jsonParser, async (req, res) => {
  const { id } = req.params;
  const { num, state, items } = req.body;

  if (state == "Hủy bỏ") {
    const promises = [];
    items?.forEach(({ id, soLuong }) => {
      promises.push(
        axios.put(`${node}/product/${id}/quantity`, {
          id,
          quantity: soLuong * -1,
        })
      );
    });

    await Promise.all(promises).catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });
  }

  await fs
    .collection(paymentName)
    .doc(id)
    .update({ [`chiTiet.${num}.tinhTrang`]: state })
    .then((_) => res.sendStatus(200))
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });
});

export default router;
