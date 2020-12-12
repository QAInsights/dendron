import { NotePropsV2 } from "@dendronhq/common-all";
import MDAST from "mdast";

export type DendronASTNode = MDAST.Parent & {
  notes?: NotePropsV2[];
};

export enum DendronASTTypes {
  WIKI_LINK = "wikiLink",
  REF_LINK = "refLink",
  PARAGRAPH = "paragraph",
}

export enum DendronASTDest {
  // MD_ENHANCED_PREVIEW = "MD_ENHANCED_PREVIEW",
  MD_REGULAR = "MD_REGULAR",
  HTML = "HTML",
}

export type DendronASTData = {
  dest: DendronASTDest;
};

export type WikiLinkNoteV4 = DendronASTNode & {
  type: DendronASTTypes.WIKI_LINK;
  value: string;
  data: WikiLinkDataV4;
};

export type WikiLinkDataV4 = {
  alias: string;
  anchorHeader?: string;
  prefix?: string;
};