import axios from "axios";
import bodyParser from "body-parser";
import * as dotenv from "dotenv";
import express from "express";
import { nanoid } from "nanoid";
import { rt } from "../firebase/admin/config.js";
import { cartObj } from "../model/cart.model.js";

dotenv.config();

const node = process.env?.HOST_NODE;

const router = express.Router();
const jsonParser = bodyParser.json();

const cartName = "gioHang";

router.get("/:id", async (req, res) => {
  const { id } = req.params;

  await rt
    .ref(`${cartName}/${id}`)
    .get()
    .then((snap) => {
      if (snap.exists()) {
        res.status(200).send(snap.val());
      } else res.sendStatus(500);
    })
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });
});

router.get("/:id/total", async (req, res) => {
  const { id } = req.params;

  await rt
    .ref(`${cartName}/${id}/tongTien`)
    .get()
    .then((snap) => {
      if (snap.exists()) {
        res.status(200).send({ total: snap.val() });
      } else res.sendStatus(500);
    })
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });
});

router.get("/:id/:cart", async (req, res) => {
  const { id, cart } = req.params;

  await rt
    .ref(`${cartName}/${id}/sanPham/${cart}`)
    .get()
    .then((snap) => {
      if (snap.exists()) res.sendStatus(500);
      else res.sendStatus(200);
    })
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });
});

router.post("/:id", async (req, res) => {
  const { id } = req.params;

  const item = JSON.parse(JSON.stringify(cartObj));
  item.id = nanoid();

  await rt
    .ref(`${cartName}/${id}`)
    .set(item)
    .then((_) => res.sendStatus(201))
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });
});

router.post("/:id/carted", jsonParser, async (req, res) => {
  const { id } = req.params;
  const item = JSON.parse(JSON.stringify(req.body?.item));
  const cart = item.id;
  delete item.id;

  await axios
    .get(`${node}/cart/${id}/${cart}`)
    .then(async (snap) => {
      if (snap.status == 200) {
        await axios
          .get(`${node}/cart/${id}/total`)
          .then(async (shot) => {
            const { total } = shot.data;
            await rt
              .ref(`${cartName}/${id}`)
              .update({ tongTien: total + item.giaTong })
              .catch((error) => {
                console.error(error);
                res.sendStatus(500);
              });
          })
          .catch((error) => {
            console.error(error);
            res.sendStatus(500);
          });
        await rt
          .ref(`${cartName}/${id}/sanPham/${cart}`)
          .set(item)
          .catch((error) => {
            console.error(error);
            res.sendStatus(500);
          });
        res.sendStatus(200);
      } else res.sendStatus(200);
    })
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });
});

router.put("/:id/:cart", jsonParser, async (req, res) => {
  const { id, cart } = req.params;
  const item = JSON.parse(JSON.stringify(req.body?.item));

  await axios
    .get(`${node}/cart/${id}/total`)
    .then(async (shot) => {
      const { total } = shot.data;
      await rt
        .ref(`${cartName}/${id}`)
        .update({ tongTien: total - item.giaTongCu + item.giaTongMoi })
        .catch((error) => {
          console.error(error);
          res.sendStatus(500);
        });
      await rt
        .ref(`${cartName}/${id}/sanPham/${cart}`)
        .update({ soLuong: item.soLuong, giaTong: item.giaTongMoi })
        .catch((error) => {
          console.error(error);
          res.sendStatus(500);
        });
      res.sendStatus(200);
    })
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  await rt
    .ref(`${cartName}/${id}`)
    .remove()
    .then((_) => res.sendStatus(200))
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });
});

router.delete("/:id/:cart", jsonParser, async (req, res) => {
  const { id, cart } = req.params;
  const { giaTong } = req.body?.item;

  await rt
    .ref(`${cartName}/${id}/sanPham/${cart}`)
    .remove()
    .then(async (_) => {
      await axios
        .get(`${node}/cart/${id}/total`)
        .then(async (shot) => {
          const { total } = shot.data;
          await rt
            .ref(`${cartName}/${id}`)
            .update({ tongTien: total - giaTong })
            .catch((error) => {
              console.error(error);
              res.sendStatus(500);
            });
        })
        .catch((error) => {
          console.error(error);
          res.sendStatus(500);
        });
      res.sendStatus(200);
    })
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });
});

export default router;
