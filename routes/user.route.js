import axios from "axios";
import bodyParser from "body-parser";
import * as dotenv from "dotenv";
import express from "express";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import multer from "multer";
import { nanoid } from "nanoid";
import { au, cs, fs } from "../firebase/admin/config.js";
import { st, th } from "../firebase/client/config.client.js";
import { userObj } from "../model/user.model.js";

dotenv.config();

const node = process.env?.HOST_NODE;

const router = express.Router();
const upload = multer();
const jsonParser = bodyParser.json();

const userName = "NguoiDung";

router.get("/", async (req, res) => {
  await fs
    .collection(userName)
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

router.get("/:id", async (req, res) => {
  const { id } = req.params;

  await fs
    .collection(userName)
    .doc(id)
    .get()
    .then((snap) => {
      if (snap.exists) {
        const data = snap.data();
        res.status(200).send(data);
      } else res.sendStatus(500);
    })
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });
});

router.post("/signup", jsonParser, async (req, res) => {
  const { email, password, displayName, role } = req.body;

  await au
    .createUser({
      email: email,
      emailVerified: false,
      password: password,
      displayName: displayName,
      disabled: false,
    })
    .then(async (user) => {
      const item = JSON.parse(JSON.stringify(userObj));
      item.id = nanoid();
      item.vaiTro = role;

      await fs
        .collection(userName)
        .doc(user.uid)
        .create(item)
        .then(async (_) => {
          await axios.post(`${node}/payment/${item.id}`).catch((error) => {
            console.error(error);
            res.sendStatus(500);
          });
          await axios
            .post(`${node}/cart/${user.uid}`)
            .then((_) => res.status(201).send({ user: user, item: item }))
            .catch((error) => {
              console.error(error);
              res.sendStatus(500);
            });
        })
        .catch((error) => {
          console.error(error);
          res.sendStatus(500);
        });
    })
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });
});

router.post("/signin", jsonParser, async (req, res) => {
  const { email, password } = req.body;

  await signInWithEmailAndPassword(th, email, password)
    .then(async (snap) => {
      const { user } = snap;
      await axios
        .get(`${node}/user/${user.uid}`)
        .then((item) => res.status(201).send({ user: user, item: item.data }))
        .catch((error) => {
          console.error(error);
          res.sendStatus(500);
        });
    })
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });
});

router.post("/signout", async (req, res) => {
  await th
    .signOut()
    .then((_) => res.sendStatus(201))
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });
});

router.post("/signstate", (req, res) => {
  th.onAuthStateChanged((user) => {
    res.status(201).send(user);
    // console.log(JSON.stringify(user));
    // res.write(JSON.stringify(user));
  });
  // res.end();
});

router.put("/:uid/:id", upload.single("hinhAnh"), async (req, res) => {
  const { uid, id } = req.params;
  const { file } = req;
  const item = req.body;

  if (file) {
    const { originalname: name, mimetype: contentType, buffer } = file;
    const path = `avatar/${id}`;
    const uploadPath = `avatar/${id}/${name}`;

    const imageRef = ref(st, uploadPath);
    const metadata = { contentType };
    
    await cs.deleteFiles({ prefix: path });
    const url = await uploadBytes(imageRef, buffer, metadata).then(
      (uploadResult) => {
        return getDownloadURL(uploadResult.ref);
      }
    );

    item.hinhAnh = url;
  }

  await fs
    .collection(userName)
    .doc(uid)
    .update(item)
    .then((_) => res.sendStatus(200))
    .catch((error) => {
      console.error(error);
      res.sendStatus(500);
    });
});

export default router;
