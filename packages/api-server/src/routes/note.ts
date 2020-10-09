import { DendronError, DEngineV2, WriteNoteResp } from "@dendronhq/common-all";
import {
  EngineDeleteRequest,
  EngineGetNoteByPathRequest,
  EngineQueryRequest,
  EngineWriteRequest,
} from "@dendronhq/common-server";
import { DendronEngineV2 } from "@dendronhq/engine-server";
import { Request, Response, Router } from "express";
import { MemoryStore } from "../store/memoryStore";

const router = Router();

router.post("/delete", async (req: Request, res: Response) => {
  const { ws, id, opts } = req.body as EngineDeleteRequest;
  const engine = await MemoryStore.instance().get<DendronEngineV2>(`ws:${ws}`);
  if (!engine) {
    throw "No Engine";
  }
  const { error, data } = await engine.deleteNote(id, opts);
  res.json({ error, data });
});

router.post("/getByPath", async (req: Request, res: Response) => {
  const { ws, ...opts } = req.body as EngineGetNoteByPathRequest;
  const engine = await MemoryStore.instance().get<DendronEngineV2>(`ws:${ws}`);
  if (!engine) {
    throw "No Engine";
  }
  const resp = await engine.getNoteByPath(opts);
  console.log({ bond: true, resp: JSON.stringify(resp) });
  res.json(resp);
});

router.post("/query", async (req: Request, res: Response) => {
  const { ws, queryString, mode } = req.body as EngineQueryRequest;
  const engine = await MemoryStore.instance().get<DendronEngineV2>(`ws:${ws}`);
  if (!engine) {
    throw "No Engine";
  }
  const { error, data } = await engine.query(queryString, mode);
  res.json({ error, data });
});

router.post("/write", async (req: Request, res: Response<WriteNoteResp>) => {
  const { ws, node, opts } = req.body as EngineWriteRequest;
  const engine = await MemoryStore.instance().get<DEngineV2>(`ws:${ws}`);
  if (!engine) {
    throw "No Engine";
  }
  try {
    const out = await engine.writeNote(node, opts);
    res.json(out);
  } catch (err) {
    res.json({
      error: new DendronError({ msg: JSON.stringify(err) }),
      data: [],
    });
  }
});

export { router as noteRouter };
