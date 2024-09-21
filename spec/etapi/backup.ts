import etapi from "../support/etapi.js";

etapi.describeEtapi("backup", () => {
  it("create", async () => {
    const response = await etapi.putEtapiContent("backup/etapi_test");
    expect(response.status).toEqual(204);
  });
});
