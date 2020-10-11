import {
  NoteChangeEntry,
  NotePropsDictV2,
  NotePropsV2,
  NoteUtilsV2,
  SchemaModulePropsV2,
  SchemaUtilsV2 as su,
} from "@dendronhq/common-all";
import {
  NodeTestPresetsV2,
  NodeTestUtilsV2,
  NoteTestPresetsV2,
  SchemaTestPresetsV2,
} from "@dendronhq/common-test-utils";
import {
  DendronAPI,
  EngineTestUtils,
  file2Schema,
  tmpDir,
} from "@dendronhq/common-server";
import fs from "fs-extra";
import path from "path";
import _ from "lodash";

async function setupWS({ wsRoot, vault }: { wsRoot: string; vault: string }) {
  const payload = {
    uri: wsRoot,
    config: {
      vaults: [vault],
    },
  };
  const api = new DendronAPI({
    endpoint: "http://localhost:3005",
    apiPath: "api",
  });
  await api.workspaceInit(payload);
  return api;
}

const getNotes = async ({
  api,
  wsRoot,
}: {
  api: DendronAPI;
  wsRoot: string;
}) => {
  const resp = await api.engineQuery({
    ws: wsRoot,
    mode: "note",
    queryString: "*",
  });
  const notes: NotePropsDictV2 = {};
  _.forEach((resp.data as unknown) as NotePropsV2, (ent: NotePropsV2) => {
    notes[ent.id] = ent;
  });
  return notes;
};

describe("schema", () => {
  let wsRoot: string;
  let vault: string;

  beforeEach(async () => {
    wsRoot = tmpDir().name;
    vault = path.join(wsRoot, "vault");
    fs.ensureDirSync(vault);
    await EngineTestUtils.setupVault({
      vaultDir: vault,
      initDirCb: async (vaultPath: string) => {
        await NodeTestUtilsV2.createNotes({ vaultPath });
        await NodeTestUtilsV2.createSchemas({ vaultPath });
        await NodeTestUtilsV2.createNoteProps({ vaultPath, rootName: "foo" });
        await NodeTestUtilsV2.createSchemaModuleOpts({
          vaultDir: vaultPath,
          rootName: "foo",
        });
      },
    });
  });

  describe("delete", () => {
    beforeEach(async () => {
      wsRoot = tmpDir().name;
      vault = path.join(wsRoot, "vault");
      fs.ensureDirSync(vault);
      await EngineTestUtils.setupVault({
        vaultDir: vault,
        initDirCb: async (vaultPath: string) => {
          await NodeTestPresetsV2.createOneNoteOneSchemaPreset({
            vaultDir: vaultPath,
          });
        },
      });
    });

    test("non-root", async () => {
      const payload = {
        uri: wsRoot,
        config: {
          vaults: [vault],
        },
      };
      const api = new DendronAPI({
        endpoint: "http://localhost:3005",
        apiPath: "api",
      });
      await api.workspaceInit(payload);
      await api.schemaDelete({
        ws: wsRoot,
        id: "foo",
      });
      const schemaPath = path.join(vault, "foo.schema.yml");
      expect(fs.existsSync(schemaPath)).toBeFalsy();
    });
  });

  describe("query", () => {
    beforeEach(async () => {
      wsRoot = tmpDir().name;
      vault = path.join(wsRoot, "vault");
      fs.ensureDirSync(vault);
      await EngineTestUtils.setupVault({
        vaultDir: vault,
        initDirCb: async (vaultPath: string) => {
          await NodeTestPresetsV2.createOneNoteOneSchemaPreset({
            vaultDir: vaultPath,
          });
        },
      });
    });

    test("root", async () => {
      const payload = {
        uri: wsRoot,
        config: {
          vaults: [vault],
        },
      };
      const api = new DendronAPI({
        endpoint: "http://localhost:3005",
        apiPath: "api",
      });
      await api.workspaceInit(payload);
      const resp = await api.schemaQuery({
        ws: wsRoot,
        qs: "",
      });
      // expect(resp).toMatchSnapshot("root note");
      _.map(
        await SchemaTestPresetsV2.createQueryRootResults(
          resp.data as SchemaModulePropsV2[]
        ),
        (ent) => {
          const { actual, expected } = ent;
          expect(actual).toEqual(expected);
        }
      );
    });

    test("all", async () => {
      const payload = {
        uri: wsRoot,
        config: {
          vaults: [vault],
        },
      };
      const api = new DendronAPI({
        endpoint: "http://localhost:3005",
        apiPath: "api",
      });
      await api.workspaceInit(payload);
      const resp = await api.schemaQuery({
        ws: wsRoot,
        qs: "*",
      });
      // expect(resp).toMatchSnapshot();
      _.map(
        await SchemaTestPresetsV2.createQueryAllResults(
          resp.data as SchemaModulePropsV2[]
        ),
        (ent) => {
          const { actual, expected } = ent;
          expect(actual).toEqual(expected);
        }
      );
    });

    test("non-root", async () => {
      const payload = {
        uri: wsRoot,
        config: {
          vaults: [vault],
        },
      };
      const api = new DendronAPI({
        endpoint: "http://localhost:3005",
        apiPath: "api",
      });
      await api.workspaceInit(payload);
      const resp = await api.schemaQuery({
        ws: wsRoot,
        qs: "foo",
      });
      expect(resp).toMatchSnapshot();
      _.map(
        await SchemaTestPresetsV2.createQueryNonRootResults(
          resp.data as SchemaModulePropsV2[]
        ),
        (ent) => {
          const { actual, expected } = ent;
          expect(actual).toEqual(expected);
        }
      );
    });
  });

  describe("write", () => {
    test("simple schema", async () => {
      const payload = {
        uri: wsRoot,
        config: {
          vaults: [vault],
        },
      };
      const api = new DendronAPI({
        endpoint: "http://localhost:3005",
        apiPath: "api",
      });
      const schema = su.createModuleProps({ fname: "pro" });
      await api.workspaceInit(payload);
      api.workspaceList();
      await api.schemaWrite({
        ws: wsRoot,
        schema,
      });
      const schemaPath = path.join(vault, "pro.schema.yml");
      const schemaOut = file2Schema(schemaPath);
      expect(
        fs.readFileSync(schemaPath, { encoding: "utf8" })
      ).toMatchSnapshot();
      expect(_.size(schemaOut.schemas)).toEqual(1);
    });
  });
});

const NOTE_DELETE_PRESET =
  NoteTestPresetsV2.presets.OneNoteOneSchemaPreset.delete;
const NOTE_UPDATE_PRESET =
  NoteTestPresetsV2.presets.OneNoteOneSchemaPreset.update;

describe("notes", () => {
  let wsRoot: string;
  let vault: string;
  let api: DendronAPI;

  describe("delete", () => {
    beforeEach(async () => {
      wsRoot = tmpDir().name;
      vault = path.join(wsRoot, "vault");
      fs.ensureDirSync(vault);
      await EngineTestUtils.setupVault({
        vaultDir: vault,
        initDirCb: async (vaultPath: string) => {
          await NodeTestPresetsV2.createOneNoteOneSchemaPreset({
            vaultDir: vaultPath,
          });
        },
      });
      api = await setupWS({ wsRoot, vault });
    });

    test("note w/children", async () => {
      await api.engineDelete({ id: "foo", ws: wsRoot });
      expect(fs.readdirSync(vault)).toMatchSnapshot();
      expect(_.includes(fs.readdirSync(vault), "foo.md")).toBeFalsy();
    });

    test(NOTE_DELETE_PRESET.noteNoChildren.label, async () => {
      const changed = await api.engineDelete({ id: "foo.ch1", ws: wsRoot });
      const resp = await api.engineQuery({
        ws: wsRoot,
        mode: "note",
        queryString: "*",
      });
      const notes: NotePropsDictV2 = {};
      _.forEach((resp.data as unknown) as NotePropsV2, (ent: NotePropsV2) => {
        notes[ent.id] = ent;
      });

      _.map(
        await NOTE_DELETE_PRESET.noteNoChildren.results({
          changed: changed.data as NoteChangeEntry[],
          vaultDir: vault,
          notes,
        }),
        (ent) => {
          expect(ent.expected).toEqual(ent.actual);
        }
      );
    });

    test(NOTE_DELETE_PRESET.domainNoChildren.label, async () => {
      fs.removeSync(path.join(vault, "foo.ch1.md"));
      api = await setupWS({ wsRoot, vault });
      const changed = await api.engineDelete({ id: "foo", ws: wsRoot });
      const resp = await api.engineQuery({
        ws: wsRoot,
        mode: "note",
        queryString: "*",
      });
      const notes: NotePropsDictV2 = {};
      _.forEach((resp.data as unknown) as NotePropsV2, (ent: NotePropsV2) => {
        notes[ent.id] = ent;
      });

      _.map(
        await NOTE_DELETE_PRESET.domainNoChildren.results({
          changed: changed.data as NoteChangeEntry[],
          vaultDir: vault,
          notes,
        }),
        (ent) => {
          expect(ent.expected).toEqual(ent.actual);
        }
      );
    });
  });

  describe("query", () => {
    beforeEach(async () => {
      wsRoot = tmpDir().name;
      vault = path.join(wsRoot, "vault");
      fs.ensureDirSync(vault);
      await EngineTestUtils.setupVault({
        vaultDir: vault,
        initDirCb: async (vaultPath: string) => {
          await NodeTestPresetsV2.createOneNoteOneSchemaPreset({
            vaultDir: vaultPath,
          });
        },
      });
    });

    test("query root", async () => {
      const payload = {
        uri: wsRoot,
        config: {
          vaults: [vault],
        },
      };
      const api = new DendronAPI({
        endpoint: "http://localhost:3005",
        apiPath: "api",
      });
      await api.workspaceInit(payload);
      const resp = await api.engineQuery({
        ws: wsRoot,
        queryString: "",
        mode: "note" as const,
      });
      expect(resp).toMatchSnapshot("root note");
    });

    test("query root note with schema", async () => {
      const payload = {
        uri: wsRoot,
        config: {
          vaults: [vault],
        },
      };
      const api = new DendronAPI({
        endpoint: "http://localhost:3005",
        apiPath: "api",
      });
      await api.workspaceInit(payload);
      const resp = await api.engineQuery({
        ws: wsRoot,
        queryString: "foo",
        mode: "note" as const,
      });
      const note = (resp.data as NotePropsV2[])[0] as NotePropsV2;
      expect(resp).toMatchSnapshot();
      expect(note.schema).toEqual({
        moduleId: "foo",
        schemaId: "foo",
      });
    });

    test("query child note with schema", async () => {
      const payload = {
        uri: wsRoot,
        config: {
          vaults: [vault],
        },
      };
      const api = new DendronAPI({
        endpoint: "http://localhost:3005",
        apiPath: "api",
      });
      await api.workspaceInit(payload);
      const resp = await api.engineQuery({
        ws: wsRoot,
        queryString: "foo.ch1",
        mode: "note" as const,
      });
      const note = (resp.data as any[])[0] as NotePropsV2;
      expect(resp).toMatchSnapshot();
      expect(note.schema).toEqual({
        moduleId: "foo",
        schemaId: "ch1",
      });
    });
  });

  describe("update", () => {
    beforeEach(async () => {
      wsRoot = tmpDir().name;
      vault = path.join(wsRoot, "vault");
      fs.ensureDirSync(vault);
      await EngineTestUtils.setupVault({
        vaultDir: vault,
        initDirCb: async (vaultPath: string) => {
          await NodeTestPresetsV2.createOneNoteOneSchemaPreset({
            vaultDir: vaultPath,
          });
        },
      });
      api = await setupWS({ wsRoot, vault });
    });

    test(NOTE_UPDATE_PRESET.noteNoChildren.label, async () => {
      const respNote = await api.engineGetNoteByPath({
        npath: "foo.ch1",
        ws: wsRoot,
      });
      const note = respNote.data?.note as NotePropsV2;
      note.body = "new body";
      await api.engineUpdateNote({ note, ws: wsRoot });
      const resp = await api.engineQuery({
        ws: wsRoot,
        mode: "note",
        queryString: "*",
      });
      const notes: NotePropsDictV2 = {};
      _.forEach((resp.data as unknown) as NotePropsV2, (ent: NotePropsV2) => {
        notes[ent.id] = ent;
      });

      _.map(
        await NOTE_UPDATE_PRESET.noteNoChildren.results({
          vaultDir: vault,
          notes,
        }),
        (ent) => {
          expect(ent.expected).toEqual(ent.actual);
        }
      );
    });
  });

  describe("write", () => {
    beforeEach(async () => {
      wsRoot = tmpDir().name;
      vault = path.join(wsRoot, "vault");
      fs.ensureDirSync(vault);
      await EngineTestUtils.setupVault({
        vaultDir: vault,
        initDirCb: async (vaultPath: string) => {
          await NodeTestUtilsV2.createNotes({ vaultPath });
          await NodeTestUtilsV2.createSchemas({ vaultPath });
          await NodeTestUtilsV2.createNoteProps({ vaultPath, rootName: "foo" });
          await NodeTestUtilsV2.createSchemaModuleOpts({
            vaultDir: vaultPath,
            rootName: "foo",
          });
        },
      });
    });
    test("new hierarchy", async () => {
      const payload = {
        uri: wsRoot,
        config: {
          vaults: [vault],
        },
      };
      const api = new DendronAPI({
        endpoint: "http://localhost:3005",
        apiPath: "api",
      });
      await api.workspaceInit(payload);
      const resp = await api.engineWrite({
        ws: wsRoot,
        node: NoteUtilsV2.create({ fname: "bond" }),
      });
      expect(resp.data.length).toEqual(2);
      const out = fs.readdirSync(vault);
      expect(out).toEqual([
        "bond.md",
        "foo.ch1.md",
        "foo.md",
        "foo.schema.yml",
        "root.md",
        "root.schema.yml",
      ]);
    });

    test("grandchild of root, child is stub", async () => {
      const payload = {
        uri: wsRoot,
        config: {
          vaults: [vault],
        },
      };
      const api = new DendronAPI({
        endpoint: "http://localhost:3005",
        apiPath: "api",
      });
      await api.workspaceInit(payload);
      const resp = await api.engineWrite({
        ws: wsRoot,
        node: NoteUtilsV2.create({ id: "bond.ch1", fname: "bond.ch1" }),
      });
      const expected = ["bond.ch1", "root"];
      expect(resp.data.length).toEqual(3);
      expect(
        _.intersection(
          resp.data.map((ent) => _.pick(ent.note, "id").id).sort(),
          expected
        ).sort()
      ).toEqual(expected);
      const out = fs.readdirSync(vault);
      expect(out.sort()).toEqual([
        "bond.ch1.md",
        "foo.ch1.md",
        "foo.md",
        "foo.schema.yml",
        "root.md",
        "root.schema.yml",
      ]);
    });

    test("child of domain", async () => {
      const payload = {
        uri: wsRoot,
        config: {
          vaults: [vault],
        },
      };
      const api = new DendronAPI({
        endpoint: "http://localhost:3005",
        apiPath: "api",
      });
      await api.workspaceInit(payload);
      const resp = await api.engineWrite({
        ws: wsRoot,
        node: NoteUtilsV2.create({ id: "foo.ch2", fname: "foo.ch2" }),
      });
      expect(resp.data.length).toEqual(2);
      expect(resp.data.map((ent) => _.pick(ent.note, "id").id).sort()).toEqual([
        "foo",
        "foo.ch2",
      ]);
      const out = fs.readdirSync(vault);
      expect(out.sort()).toEqual([
        "foo.ch1.md",
        "foo.ch2.md",
        "foo.md",
        "foo.schema.yml",
        "root.md",
        "root.schema.yml",
      ]);
    });

    const NOTE_WRITE_PRESET =
      NoteTestPresetsV2.presets.OneNoteOneSchemaPreset.write;
    test(NOTE_WRITE_PRESET["domainStub"].label, async () => {
      await NOTE_WRITE_PRESET["domainStub"].before({ vaultDir: vault });
      const results = NOTE_WRITE_PRESET["domainStub"].results;
      const payload = {
        uri: wsRoot,
        config: {
          vaults: [vault],
        },
      };
      const api = new DendronAPI({
        endpoint: "http://localhost:3005",
        apiPath: "api",
      });
      await api.workspaceInit(payload);
      await api.engineWrite({
        ws: wsRoot,
        node: NoteUtilsV2.create({ id: "bar.ch1", fname: "bar.ch1" }),
      });
      const notes = await getNotes({ api, wsRoot });
      await NodeTestPresetsV2.runMochaHarness({
        opts: {
          notes,
        },
        results,
      });
    });

    test("grandchild of domain, child is stub", async () => {
      const payload = {
        uri: wsRoot,
        config: {
          vaults: [vault],
        },
      };
      const api = new DendronAPI({
        endpoint: "http://localhost:3005",
        apiPath: "api",
      });
      await api.workspaceInit(payload);
      const resp = await api.engineWrite({
        ws: wsRoot,
        node: NoteUtilsV2.create({ id: "foo.ch2.gch1", fname: "foo.ch2.gch1" }),
      });
      const expected = ["foo", "foo.ch2.gch1"];
      expect(resp.data.length).toEqual(3);
      expect(
        _.intersection(
          resp.data.map((ent) => _.pick(ent.note, "id").id).sort(),
          expected
        )
      ).toEqual(expected);
      const out = fs.readdirSync(vault);
      expect(out.sort()).toEqual([
        "foo.ch1.md",
        "foo.ch2.gch1.md",
        "foo.md",
        "foo.schema.yml",
        "root.md",
        "root.schema.yml",
      ]);
    });
  });
});