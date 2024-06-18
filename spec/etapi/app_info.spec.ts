import etapi = require("../support/etapi");

etapi.describeEtapi("app_info", () => {
  it("get", async () => {
    const appInfo = await etapi.getEtapi("app-info");
    expect(appInfo.clipperProtocolVersion).toEqual("1.0");
  });
});
