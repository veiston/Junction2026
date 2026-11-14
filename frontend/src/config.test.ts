describe("config", () => {
  afterEach(() => {
    delete process.env.EXPO_PUBLIC_DEMO_CUSTOMER_ID;
    jest.resetModules();
  });

  it("defaults the demo customer to CUST02706", () => {
    delete process.env.EXPO_PUBLIC_DEMO_CUSTOMER_ID;
    jest.isolateModules(() => {
      expect(require("./config").DEMO_CUSTOMER_ID).toBe("CUST02706");
    });
  });

  it("keeps the env override", () => {
    process.env.EXPO_PUBLIC_DEMO_CUSTOMER_ID = "CUST00042";
    jest.isolateModules(() => {
      expect(require("./config").DEMO_CUSTOMER_ID).toBe("CUST00042");
    });
  });
});
