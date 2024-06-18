import etapi = require("../support/etapi");
import fs = require("fs");
import path = require("path");

etapi.describeEtapi("import", () => {
  // temporarily skip this test since test-export.zip is missing
  xit("import", async () => {
    const zipFileBuffer = fs.readFileSync(
      path.resolve(__dirname, "test-export.zip")
    );

    const response = await etapi.postEtapiContent(
      "notes/root/import",
      zipFileBuffer
    );
    expect(response.status).toEqual(201);

    const { note, branch } = await response.json();

    expect(note.title).toEqual("test-export");
    expect(branch.parentNoteId).toEqual("root");

    const content = await (
      await etapi.getEtapiContent(`notes/${note.noteId}/content`)
    ).text();
    expect(content).toContain("test export content");
  });
});
