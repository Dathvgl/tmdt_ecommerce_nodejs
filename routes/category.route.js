import bodyParser from "body-parser";
import express from "express";
import { fs } from "../firebase/admin/config.js";

const router = express.Router();
const jsonParser = bodyParser.json();

const categoryName = "DanhMuc";

router.get("/", async (req, res) => {
  await fs
    .collection(categoryName)
    .get()
    .then((snap) => {
      const data = [];
      snap.forEach((doc) => data.push(doc.data()));
      res.status(200).send(data);
    })
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });
});

router.put("/:id", jsonParser, async (req, res) => {
  const { id } = req.params;
  const item = JSON.parse(JSON.stringify(req.body?.item));

  await fs
    .collection(categoryName)
    .doc(id)
    .update(item)
    .then((_) => res.sendStatus(200))
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });
});

export default router;
