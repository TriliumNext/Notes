import etapi = require("../support/etapi");

etapi.describeEtapi("backup", () => {
  it("create", async () => {
    const response = await etapi.putEtapiContent("backup/etapi_test");
    expect(response.status).toEqual(204);
  });
});
