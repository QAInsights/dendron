import { DirResult, FileTestUtils } from "@dendronhq/common-server";
import { NodeTestPresetsV2 } from "@dendronhq/common-test-utils";
import assert from "assert";
import _ from "lodash";
import { afterEach, beforeEach } from "mocha";
// // You can import and use all API from the 'vscode' module
// // as well as import your extension to test it
import * as vscode from "vscode";
import { GotoNoteCommand } from "../../commands/GotoNote";
import { HistoryService } from "../../services/HistoryService";
import { VSCodeUtils } from "../../utils";
import { DendronWorkspace } from "../../workspace";
import {
  getActiveEditorBasename,
  onWSInit,
  setupDendronWorkspace,
  TIMEOUT,
} from "../testUtils";

suite("notes", function () {
  let root: DirResult;
  let ctx: vscode.ExtensionContext;
  let vaultPath: string;
  this.timeout(TIMEOUT);

  beforeEach(function () {
    root = FileTestUtils.tmpDir();
    ctx = VSCodeUtils.getOrCreateMockContext();
    DendronWorkspace.getOrCreate(ctx);
  });

  afterEach(function () {
    HistoryService.instance().clearSubscriptions();
  });

  test("basic", (done) => {
    onWSInit(async () => {
      const note = DendronWorkspace.instance().getEngine().notes["foo"];
      const out = await new GotoNoteCommand().run({ qs: "foo", mode: "note" });
      assert.deepStrictEqual(out, note);
      assert.strictEqual(getActiveEditorBasename(), "foo.md");
      done();
    });
    setupDendronWorkspace(root.name, ctx, {
      lsp: true,
      useCb: async (vaultDir) => {
        vaultPath = vaultDir;
        await NodeTestPresetsV2.createOneNoteoneSchemaPreset({ vaultDir });
      },
    });
  });

  test("go to stub", (done) => {
    onWSInit(async () => {
      const out = await new GotoNoteCommand().run({
        qs: "foo.ch2",
        mode: "note",
      });
      assert.deepStrictEqual(_.pick(out, ["fname", "stub"]), {
        fname: "foo.ch2",
      });
      assert.strictEqual(getActiveEditorBasename(), "foo.ch2.md");
      done();
    });
    setupDendronWorkspace(root.name, ctx, {
      lsp: true,
      useCb: async (vaultDir) => {
        vaultPath = vaultDir;
        await NodeTestPresetsV2.createOneNoteoneSchemaPreset({ vaultDir });
      },
    });
  });
});
