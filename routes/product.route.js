import bodyParser from "body-parser";
import express from "express";
import { ServerValue } from "firebase-admin/database";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import multer from "multer";
import { nanoid } from "nanoid";
import { rt } from "../firebase/admin/config.js";
import { st } from "../firebase/client/config.client.js";
import { racmtObj } from "../model/product.model.js";

const router = express.Router();
const upload = multer();
const jsonParser = bodyParser.json();

const productName = "sanPham";
const racmtName = "rateComment";
const imageDir = "imagesProduct";

router.get("/", async (req, res) => {
  await rt
    .ref(productName)
    .get()
    .then((snap) => {
      if (snap.exists()) res.status(200).send(snap);
      else res.sendStatus(500);
    })
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });
});

router.get("/racmt/:id", async (req, res) => {
  const { id } = req.params;

  await rt
    .ref(`${racmtName}/${id}`)
    .get()
    .then((snap) => {
      if (snap.exists()) res.status(200).send(snap);
      else res.sendStatus(500);
    })
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });
});

router.post("/", upload.array("hinhAnh"), async (req, res) => {
  const { body } = req;
  const promises = [];

  const item = {};
  const images = req.files;

  Object.keys(body).forEach((key) => {
    item[key] = JSON.parse(body[key]);
  });

  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();

  item.coBan.tinhTrang = "off";
  item.coBan.soLuong = 0;
  item.coBan.ngayNhap = `${yyyy}-${mm}-${dd}`;

  item.coBan.danhGia = 0;
  item.coBan.tongDanhGia = 0;

  const key = nanoid();

  images?.forEach((file) => {
    const { originalname: name, mimetype: contentType, buffer } = file;
    const uploadPath = `${imageDir}/${key}/${name}`;

    const imageRef = ref(st, uploadPath);
    const metadata = { contentType };

    promises.push(
      uploadBytes(imageRef, buffer, metadata).then((uploadResult) => {
        return getDownloadURL(uploadResult.ref);
      })
    );
  });

  item.coBan.hinhAnh = await Promise.all(promises);

  await rt
    .ref(`${racmtName}/${key}/rated`)
    .set({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });

  await rt
    .ref(`${productName}/${key}`)
    .set(item)
    .then((_) => res.sendStatus(201))
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });
});

router.post("/racmt/:id", jsonParser, async (req, res) => {
  const { id } = req.params;
  const { item } = req.body;

  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();

  const racmt = JSON.parse(JSON.stringify(racmtObj));
  racmt.userId = item?.userId;
  racmt.hoTen = item?.hoTen;
  racmt.rate = item?.rating;
  racmt.comment = item?.comment;
  racmt.racmtDate = `${yyyy}-${mm}-${dd}`;

  const racmtId = nanoid();

  await rt
    .ref(`${productName}/${id}/coBan`)
    .update({
      danhGia: item?.newRate,
      tongDanhGia: item?.newTotalRate,
      soLuong: ServerValue.increment(item?.soLuong * -1),
    })
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });

  await rt
    .ref(`${racmtName}/${id}/rated`)
    .update({ [racmt.rate]: ServerValue.increment(1) })
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });

  await rt
    .ref(`${racmtName}/${id}/${racmtId}`)
    .set(racmt)
    .then((_) => res.sendStatus(201))
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });
});

router.put("/:id/quantity", jsonParser, async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;

  await rt
    .ref(`${productName}/${id}/coBan`)
    .update({ soLuong: ServerValue.increment(quantity) })
    .then((_) => res.sendStatus(200))
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });
});

router.put("/:id/state", jsonParser, async (req, res) => {
  const { id } = req.params;
  const { state } = req.body;

  await rt
    .ref(`${productName}/${id}/coBan`)
    .update({ tinhTrang: state })
    .then((_) => res.sendStatus(200))
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });
});

export default router;
